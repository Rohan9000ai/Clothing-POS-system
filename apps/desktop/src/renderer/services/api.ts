const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4310/api";

export interface HealthResponse {
  status: "ok" | "degraded";
  app: string;
  env: string;
  timestamp: string;
  checks: {
    database: { status: "ok" | "error"; message?: string };
  };
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/health`);
  // Health endpoint intentionally returns 503 (not just 200) when the DB
  // check fails, but the body is still valid JSON we want to read either way.
  if (!res.ok && res.status !== 503) {
    throw new Error(`Health check request failed with status ${res.status}`);
  }
  return res.json();
}