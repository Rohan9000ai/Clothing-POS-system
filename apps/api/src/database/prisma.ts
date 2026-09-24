/**
 * Prisma client singleton with SQLite safety pragmas applied on every connection.
 * WAL mode + foreign key enforcement are critical for Muzammil Store's data-safety
 * requirements (see docs/architecture/overview.md — "Data safety" section).
 */

import { PrismaClient } from "@prisma/client";
import { env } from "../common/env";
import { logger } from "../common/logger";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: env.isDev ? ["warn", "error"] : ["warn", "error"],
  });

  // Apply SQLite safety pragmas on every new connection.
  // NOTE: `PRAGMA journal_mode = WAL` returns a row (the resulting mode),
  // so it must go through $queryRawUnsafe, not $executeRawUnsafe (which
  // rejects any statement that returns rows). `PRAGMA foreign_keys = ON`
  // returns no rows, so $executeRawUnsafe is correct for that one.
  client
    .$queryRawUnsafe("PRAGMA journal_mode = WAL;")
    .then(() => logger.debug("SQLite WAL mode enabled"))
    .catch((err) => logger.error("Failed to enable WAL mode", { err: String(err) }));

  client
    .$executeRawUnsafe("PRAGMA foreign_keys = ON;")
    .then(() => logger.debug("SQLite foreign key enforcement enabled"))
    .catch((err) =>
      logger.error("Failed to enable foreign key enforcement", { err: String(err) })
    );

  return client;
}

// Reuse the same client across hot reloads in development to avoid
// exhausting database connections.
export const prisma = globalThis.__prisma ?? createPrismaClient();

if (env.isDev) {
  globalThis.__prisma = prisma;
}

/**
 * Used by the health check endpoint and by startup checks — confirms the
 * database is actually reachable, not just that the client object exists.
 */
export async function checkDatabaseConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await prisma.$queryRawUnsafe("SELECT 1;");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}