import { useCallback, useEffect, useRef, useState } from "react";
import type { ReportQueryParams } from "../../services/reports";

/**
 * Loads one report whenever the query changes. An older, slower request can
 * never overwrite the result of a newer one.
 */
export function useReportData<T>(load: (query: ReportQueryParams) => Promise<T>, query: ReportQueryParams | null) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const latestRequest = useRef(0);

  const queryKey = query ? JSON.stringify(query) : null;

  useEffect(() => {
    if (queryKey === null) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const requestId = ++latestRequest.current;
    setIsLoading(true);
    setError(null);

    load(JSON.parse(queryKey) as ReportQueryParams)
      .then((result) => {
        if (requestId === latestRequest.current) setData(result);
      })
      .catch((err: unknown) => {
        if (requestId !== latestRequest.current) return;
        // Don't leave the previous period's numbers on screen under a new heading.
        setData(null);
        setError(err instanceof Error ? err.message : "Could not load the report.");
      })
      .finally(() => {
        if (requestId === latestRequest.current) setIsLoading(false);
      });
  }, [queryKey, reloadToken, load]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { data, isLoading, error, reload };
}