/**
 * Muzammil Store POS — API entry point.
 *
 * Runs as a local Express service. In production this is embedded/launched
 * alongside the Electron app (wired up on Day 4); during development it can
 * be run standalone with `npm run dev --workspace=apps/api` and hit directly
 * at http://localhost:<API_PORT>.
 */

import express from "express";
import cors from "cors";
import { env } from "./common/env";
import { logger } from "./common/logger";
import { errorHandlerMiddleware } from "./common/error-handler.middleware";
import { checkDatabaseConnection, disconnectDatabase } from "./database/prisma";

import { healthRouter } from "./modules/health/health.module";
import { authRouter } from "./modules/auth/auth.module";
import { usersRouter } from "./modules/users/users.module";
import { inventoryRouter } from "./modules/inventory/inventory.module";
import { salesRouter } from "./modules/sales/sales.module";
import { suppliersRouter } from "./modules/suppliers/suppliers.module";
import { salesmenRouter } from "./modules/salesmen/salesmen.module";
import { expensesRouter } from "./modules/expenses/expenses.module";
import { reportsRouter } from "./modules/reports/reports.module";
import { settingsRouter } from "./modules/settings/settings.module";

const app = express();

app.use(cors());
app.use(express.json());

// ---- Routes ----
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/sales", salesRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/salesmen", salesmenRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/settings", settingsRouter);

// ---- 404 for unknown routes ----
app.use((req, res) => {
  res.status(404).json({
    error: {
      category: "INPUT",
      code: "ROUTE_NOT_FOUND",
      messageKey: "errors.input.routeNotFound",
      message: `No route found for ${req.method} ${req.path}`,
    },
  });
});

// ---- Central error handler — must be registered last ----
app.use(errorHandlerMiddleware);

async function bootstrap() {
  const dbCheck = await checkDatabaseConnection();
  if (!dbCheck.ok) {
    logger.error("Database is not reachable at startup. Server will still start, but requests needing the database will fail.", {
      error: dbCheck.error,
    });
  } else {
    logger.info("Database connection verified.");
  }

  const server = app.listen(env.apiPort, () => {
    logger.info(`${env.appName} API listening on http://localhost:${env.apiPort}`, {
      env: env.appEnv,
    });
  });

  // Graceful shutdown — always disconnect Prisma cleanly rather than
  // letting the process die mid-write.
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  logger.error("Fatal error during startup", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});