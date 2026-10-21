import { useCallback, useEffect, useRef, useState } from "react";
import { dashboardApi, type DashboardData } from "../../services/dashboard";

const REFRESH_EVERY_MS = 60_000;

/**
 * Loads the dashboard, then keeps it fresh: every minute, and whenever the
 * window comes back into focus. If a refresh fails the last good numbers stay
 * on screen, and an older, slower request can never overwrite a newer one.
 */
export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const latestRequest = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setIsRefreshing(true);
    try {
      const result = await dashboardApi.get();
      if (requestId !== latestRequest.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError(err instanceof Error ? err.message : "Could not load the dashboard.");
    } finally {
      if (requestId === latestRequest.current) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_EVERY_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return { data, error, isRefreshing, refresh };
}