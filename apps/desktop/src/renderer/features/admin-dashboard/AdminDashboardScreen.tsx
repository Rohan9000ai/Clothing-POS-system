import { useEffect, useState } from "react";
import { Card, Badge, type BadgeTone } from "@muzammil-pos/ui";
import { getHealth, type HealthResponse } from "../../services/api";

type ConnectionState = "connecting" | "connected" | "degraded" | "error";

const KPI_PLACEHOLDERS = [
  { label: "Today's Sales", value: "—" },
  { label: "Today's Bill Count", value: "—" },
  { label: "Today's Expenses", value: "—" },
  { label: "Total Stock Items", value: "—" },
];

const STATUS_CONFIG: Record<ConnectionState, { label: string; tone: BadgeTone }> = {
  connecting: { label: "Checking…", tone: "neutral" },
  connected: { label: "Connected", tone: "success" },
  degraded: { label: "Degraded", tone: "warning" },
  error: { label: "Disconnected", tone: "danger" },
};

export function AdminDashboardScreen() {
  const [state, setState] = useState<ConnectionState>("connecting");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      setState("connecting");
      try {
        const result = await getHealth();
        if (cancelled) return;
        setHealth(result);
        setState(result.status === "ok" ? "connected" : "degraded");
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setState("error");
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const statusConfig = STATUS_CONFIG[state];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-title text-gray-900">HQ Dashboard</h2>
        <p className="text-sm text-gray-400">Overview of Muzammil Store operations</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {KPI_PLACEHOLDERS.map((kpi) => (
          <Card key={kpi.label}>
            <p className="text-xs text-gray-400">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">System Health</p>
            <p className="text-xs text-gray-400">Connection between desktop app and local API</p>
          </div>
          <Badge tone={statusConfig.tone}>{statusConfig.label}</Badge>
        </div>

        <div className="mt-4 space-y-1 text-sm">
          {state === "connecting" && <p className="text-gray-500">Checking connection…</p>}

          {state === "connected" && health && (
            <>
              <p className="text-gray-600">
                API: <span className="font-medium text-gray-900">{health.app}</span> ({health.env})
              </p>
              <p className="text-gray-600">
                Database: <span className="font-medium text-success">{health.checks.database.status}</span>
              </p>
              <p className="text-xs text-gray-400">
                Last checked: {new Date(health.timestamp).toLocaleTimeString()}
              </p>
            </>
          )}

          {state === "degraded" && health && (
            <p className="text-warning">
              API reachable, but database check failed: {health.checks.database.message ?? "unknown error"}
            </p>
          )}

          {state === "error" && (
            <p className="text-danger">
              Could not reach the API. Make sure the backend is running (`npm run dev` in{" "}
              <code className="rounded bg-danger-light px-1">apps/api</code>). {errorMessage}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}