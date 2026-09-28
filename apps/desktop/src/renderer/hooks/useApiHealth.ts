import { useEffect, useState } from "react";
import { getHealth, type HealthResponse } from "../services/api";

export type ConnectionState = "connecting" | "connected" | "degraded" | "error";

/** Polls the API health endpoint so the UI can show live connection status. */
export function useApiHealth(intervalMs: number = 15000) {
  const [state, setState] = useState<ConnectionState>("connecting");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const result = await getHealth();
        if (cancelled) return;
        setHealth(result);
        setErrorMessage(null);
        setState(result.status === "ok" ? "connected" : "degraded");
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setState("error");
      }
    }

    void check();
    const timer = setInterval(check, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return { state, health, errorMessage };
}