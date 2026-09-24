import { useEffect, useState } from "react";
import { getHealth, type HealthResponse } from "../../services/api";

type ConnectionState = "connecting" | "connected" | "degraded" | "error";

const KPI_PLACEHOLDERS = [
  { label: "Today's Sales", value: "—" },
  { label: "Today's Bill Count", value: "—" },
  { label: "Today's Expenses", value: "—" },
  { label: "Total Stock Items", value: "—" },
];

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">HQ Dashboard</h2>
        <p className="text-sm text-gray-400">Overview of Muzammil Store operations</p>
      </div>

      {/* KPI row — placeholders until Sales/Inventory modules are built */}
      <div className="grid grid-cols-4 gap-4">
        {KPI_PLACEHOLDERS.map((kpi) => (
          <div key={kpi.label} className="rounded-card border border-gray-200 bg-white p-5">
            <p className="text-xs text-gray-400">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* System health card — this is the Day 4 "connect renderer to API" proof */}
      <div className="rounded-card border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">System Health</p>
            <p className="text-xs text-gray-400">Connection between desktop app and local API</p>
          </div>
          <StatusBadge state={state} />
        </div>

        <div className="mt-4 space-y-1 text-sm">
          {state === "connecting" && <p className="text-gray-500">Checking connection…</p>}

          {state === "connected" && health && (
            <>
              <p className="text-gray-600">
                API: <span className="font-medium text-gray-900">{health.app}</span> ({health.env})
              </p>
              <p className="text-gray-600">
                Database:{" "}
                <span className="font-medium text-green-600">{health.checks.database.status}</span>
              </p>
              <p className="text-xs text-gray-400">Last checked: {new Date(health.timestamp).toLocaleTimeString()}</p>
            </>
          )}

          {state === "degraded" && health && (
            <p className="text-amber-600">
              API reachable, but database check failed: {health.checks.database.message ?? "unknown error"}
            </p>
          )}

          {state === "error" && (
            <p className="text-red-600">
              Could not reach the API. Make sure the backend is running (`npm run dev` in{" "}
              <code className="rounded bg-red-50 px-1">apps/api</code>). {errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ state }: { state: ConnectionState }) {
  const config: Record<ConnectionState, { label: string; className: string }> = {
    connecting: { label: "Checking…", className: "bg-gray-100 text-gray-500" },
    connected: { label: "Connected", className: "bg-green-100 text-green-700" },
    degraded: { label: "Degraded", className: "bg-amber-100 text-amber-700" },
    error: { label: "Disconnected", className: "bg-red-100 text-red-700" },
  };
  const { label, className } = config[state];

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>{label}</span>
  );
}