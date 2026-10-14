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
      `[env] Missing required environment variable: ${name}. Check apps/api/.env`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

// Absolute path to apps/api, used as the anchor for resolving other
// relative paths (uploads, backups, logs) consistently regardless of
// which file does the resolving.
const apiRootDir = path.resolve(__dirname, "../..");

/**
 * Prisma resolves a relative SQLite path against the folder that holds
 * schema.prisma (apps/api/prisma), NOT against apps/api. Backups need the
 * real file location, so resolve it the same way Prisma does.
 */
function resolveSqliteFilePath(databaseUrl: string): string {
  const raw = (databaseUrl.replace(/^file:/, "").split("?")[0] ?? "").trim();
  return path.isAbsolute(raw) ? raw : path.resolve(apiRootDir, "prisma", raw);
}

const databaseUrl = required("DATABASE_URL");
const uploadsDirRaw = optional("UPLOADS_DIR", "../../database/uploads");
const backupDirRaw = optional("BACKUP_DIR", "../../database/backups");
const backupSecondaryRaw = optional("BACKUP_SECONDARY_DIR", "");
const backupRcloneRemoteRaw = optional("BACKUP_RCLONE_REMOTE", "").replace(/\/+$/, "");

export const env = {
  appName: optional("APP_NAME", "Muzammil Store POS"),
  appEnv: optional("APP_ENV", "development"),
  defaultLanguage: optional("APP_DEFAULT_LANGUAGE", "en"),

  databaseUrl,
  databaseFilePath: resolveSqliteFilePath(databaseUrl),

  authSecret: optional("AUTH_SECRET", "dev-only-insecure-secret-change-me"),
  authTokenExpiry: optional("AUTH_TOKEN_EXPIRY", "12h"),
  sessionInactivityTimeoutMin: Number(
    optional("SESSION_INACTIVITY_TIMEOUT_MIN", "30"),
  ),

  backupDir: backupDirRaw,
  backupRootDir: path.resolve(apiRootDir, backupDirRaw),
  backupKeepCount: Number(optional("BACKUP_KEEP_COUNT", "7")),
  backupAutoIntervalHours: Number(optional("BACKUP_AUTO_INTERVAL_HOURS", "24")),
  backupSecondaryDir: backupSecondaryRaw,
  /** Absolute path of the second backup location (USB / synced folder), or "" if not set. */
  backupSecondaryRootDir: backupSecondaryRaw
    ? path.resolve(apiRootDir, backupSecondaryRaw)
    : "",
  /** rclone destination such as "gdrive:muzammil-backups", or "" if not used. */
  backupRcloneRemote: backupRcloneRemoteRaw,
  thermalPrinterName: optional("THERMAL_PRINTER_NAME", ""),
  receiptPaperWidthMm: Number(optional("RECEIPT_PAPER_WIDTH_MM", "80")),

  reportsOutputDir: optional("REPORTS_OUTPUT_DIR", "../../database/reports"),

  uploadsDir: uploadsDirRaw,
  uploadsRootDir: path.resolve(apiRootDir, uploadsDirRaw),
  maxUploadSizeMb: Number(optional("MAX_UPLOAD_SIZE_MB", "10")),

  logLevel: optional("LOG_LEVEL", "info") as
    "debug" | "info" | "warn" | "error",
  logDir: optional("LOG_DIR", "../../database/logs"),

  apiPort: Number(optional("API_PORT", "4310")),

  isDev: optional("APP_ENV", "development") === "development",
};