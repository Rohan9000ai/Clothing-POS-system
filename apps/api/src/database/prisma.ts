/**
 * Prisma client singleton with SQLite safety pragmas applied on every connection.
 * WAL mode + foreign key enforcement are critical for Muzammil Store's data-safety
 * requirements (see docs/architecture/overview.md — "Data safety" section).
 */

import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      process.env.APP_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

  // Apply SQLite safety pragmas on every new connection.
  // - WAL mode: much safer against crashes/power loss (important for Pakistan power cuts)
  // - foreign_keys ON: enforce all FK constraints defined in schema.prisma
  client.$executeRawUnsafe("PRAGMA journal_mode = WAL;").catch((err) => {
    console.error("[prisma] failed to enable WAL mode:", err);
  });
  client.$executeRawUnsafe("PRAGMA foreign_keys = ON;").catch((err) => {
    console.error("[prisma] failed to enable foreign key enforcement:", err);
  });

  return client;
}

// Reuse the same client across hot reloads in development to avoid
// exhausting database connections.
export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.APP_ENV === "development") {
  globalThis.__prisma = prisma;
}