import type { Request, Response } from "express";
import { checkDatabaseConnection } from "../../database/prisma";
import { env } from "../../common/env";

export async function getHealth(_req: Request, res: Response) {
  const dbStatus = await checkDatabaseConnection();

  const payload = {
    status: dbStatus.ok ? "ok" : "degraded",
    app: env.appName,
    env: env.appEnv,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbStatus.ok
        ? { status: "ok" }
        : { status: "error", message: dbStatus.error },
    },
  };

  // Health check itself should not throw — it reports status, including a
  // degraded database, with a 200 for "reachable but degraded" and 503 only
  // if the API process itself can't respond meaningfully (rare, since we got here).
  const statusCode = dbStatus.ok ? 200 : 503;
  res.status(statusCode).json(payload);
}