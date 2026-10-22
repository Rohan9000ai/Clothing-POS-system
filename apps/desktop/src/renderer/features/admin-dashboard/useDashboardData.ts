import { useCallback, useEffect, useRef, useState } from "react";
import { dashboardApi, type DashboardData } from "../../services/dashboard";

const REFRESH_EVERY_MS = 60_000;
const STORAGE_KEY = "muzammil-dashboard-auto-refresh";

export type RefreshSource = "auto" | "manual";

function readAutoRefresh(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

function storeAutoRefresh(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "on" : "off");
  } catch {
    // The choice just isn't remembered.
  }
}

/**
 * Loads the dashboard and (while auto-refresh is on) keeps it fresh: every
 * minute while the window is visible, and whenever it regains focus. If a
 * refresh fails the last good numbers stay on screen, and an older, slower
 * request can never overwrite a newer one.
 */
export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshingSource, setRefreshingSource] = useState<RefreshSource | null>(null);
  const [autoRefresh, setAutoRefreshState] = useState<boolean>(readAutoRefresh);
  const latestRequest = useRef(0);

  const load = useCallback(async (source: RefreshSource) => {
    const requestId = ++latestRequest.current;
    setRefreshingSource(source);
    try {
      const result = await dashboardApi.get();
      if (requestId !== latestRequest.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError(err instanceof Error ? err.message : "Could not load the dashboard.");
    } finally {
      if (requestId === latestRequest.current) setRefreshingSource(null);
    }
  }, []);

  // The first load always happens, even if auto-refresh is paused.
  useEffect(() => {
    void load("auto");
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      if (!document.hidden) void load("auto");
    }, REFRESH_EVERY_MS);
    const onFocus = () => void load("auto");
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [autoRefresh, load]);

  const setAutoRefresh = useCallback(
    (next: boolean) => {
      storeAutoRefresh(next);
      setAutoRefreshState(next);
      // Switching it back on catches up straight away.
      if (next) void load("auto");
    },
    [load]
  );

  const refresh = useCallback(() => load("manual"), [load]);

  return { data, error, refreshingSource, autoRefresh, setAutoRefresh, refresh };
}