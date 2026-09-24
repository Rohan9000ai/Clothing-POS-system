/**
 * Centralized, typed environment variable access.
 * Fails loudly and early if something critical is missing, instead of
 * letting a missing var surface as a confusing error deep in Prisma or Express.
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `[env] Missing required environment variable: ${name}. Check apps/api/.env`
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

export const env = {
  appName: optional("APP_NAME", "Muzammil Store POS"),
  appEnv: optional("APP_ENV", "development"),
  defaultLanguage: optional("APP_DEFAULT_LANGUAGE", "en"),

  databaseUrl: required("DATABASE_URL"),

  authSecret: optional("AUTH_SECRET", "dev-only-insecure-secret-change-me"),
  authTokenExpiry: optional("AUTH_TOKEN_EXPIRY", "12h"),
  sessionInactivityTimeoutMin: Number(
    optional("SESSION_INACTIVITY_TIMEOUT_MIN", "30")
  ),

  backupDir: optional("BACKUP_DIR", "../../database/backups"),
  backupKeepCount: Number(optional("BACKUP_KEEP_COUNT", "7")),
  backupAutoIntervalHours: Number(optional("BACKUP_AUTO_INTERVAL_HOURS", "24")),
  backupSecondaryDir: optional("BACKUP_SECONDARY_DIR", ""),

  thermalPrinterName: optional("THERMAL_PRINTER_NAME", ""),
  receiptPaperWidthMm: Number(optional("RECEIPT_PAPER_WIDTH_MM", "80")),

  reportsOutputDir: optional("REPORTS_OUTPUT_DIR", "../../database/reports"),

  logLevel: optional("LOG_LEVEL", "info") as "debug" | "info" | "warn" | "error",
  logDir: optional("LOG_DIR", "../../database/logs"),

  apiPort: Number(optional("API_PORT", "4310")),

  isDev: optional("APP_ENV", "development") === "development",
};