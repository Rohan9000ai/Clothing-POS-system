import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { env } from "../../common/env";
import { logger } from "../../common/logger";
import { Errors } from "../../common/errors";
import { recordAuditLog } from "../../common/audit-log";

export type BackupTrigger = "MANUAL" | "AUTO";

export interface BackupInfo {
  name: string;
  createdAt: string;
  trigger: BackupTrigger | "UNKNOWN";
  databaseBytes: number;
  uploadFiles: number;
  uploadBytes: number;
  /** "ok" when the copy passed SQLite's integrity check. */
  integrity: string;
  /** Result of copying this backup to the second location. */
  secondary: { configured: boolean; ok: boolean; error?: string };
}

const BACKUP_NAME_PATTERN = /^muzammil_store_backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;
const DB_FILE_NAME = "muzammil_store.db";

let backupRunning = false;

function timestampName(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `muzammil_store_backup_${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
    `_${p(date.getHours())}-${p(date.getMinutes())}-${p(date.getSeconds())}`
  );
}

function folderStats(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  if (!fs.existsSync(dir)) return { files, bytes };
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = folderStats(full);
      files += sub.files;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += fs.statSync(full).size;
    }
  }
  return { files, bytes };
}

/** Newest first. Only folders that look like our own backups are ever touched. */
function listBackupNames(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && BACKUP_NAME_PATTERN.test(e.name))
    .map((e) => e.name)
    .sort()
    .reverse();
}

function pruneOldBackups(root: string) {
  const keep = Math.max(env.backupKeepCount, 1);
  for (const old of listBackupNames(root).slice(keep)) {
    fs.rmSync(path.join(root, old), { recursive: true, force: true });
    logger.info("Removed old backup", { name: old, location: root });
  }
}

function readBackupInfo(root: string, name: string): BackupInfo {
  const dir = path.join(root, name);
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8")) as Partial<BackupInfo>;
    return {
      name,
      createdAt: parsed.createdAt ?? fs.statSync(dir).mtime.toISOString(),
      trigger: parsed.trigger ?? "UNKNOWN",
      databaseBytes: parsed.databaseBytes ?? 0,
      uploadFiles: parsed.uploadFiles ?? 0,
      uploadBytes: parsed.uploadBytes ?? 0,
      integrity: parsed.integrity ?? "unknown",
      secondary: parsed.secondary ?? { configured: false, ok: false },
    };
  } catch {
    // Folder exists but its manifest is missing or unreadable.
    return {
      name,
      createdAt: fs.statSync(dir).mtime.toISOString(),
      trigger: "UNKNOWN",
      databaseBytes: 0,
      uploadFiles: 0,
      uploadBytes: 0,
      integrity: "unknown",
      secondary: { configured: false, ok: false },
    };
  }
}

/** Opens the backup copy on its own and asks SQLite whether the file is healthy. */
async function checkIntegrity(dbFile: string): Promise<string> {
  const client = new PrismaClient({ datasources: { db: { url: `file:${dbFile}` } } });
  try {
    const rows = await client.$queryRawUnsafe<{ integrity_check: string }[]>("PRAGMA integrity_check;");
    return rows[0]?.integrity_check ?? "no result";
  } finally {
    await client.$disconnect();
  }
}

export function listBackups(): BackupInfo[] {
  return listBackupNames(env.backupRootDir).map((name) => readBackupInfo(env.backupRootDir, name));
}

export function getBackupStatus() {
  const backups = listBackups();
  const last = backups[0];
  const hoursSinceLast = last ? (Date.now() - Date.parse(last.createdAt)) / 3_600_000 : null;
  const staleAfterHours = Math.max(env.backupAutoIntervalHours * 2, 24);

  return {
    backupDir: env.backupRootDir,
    secondaryDir: env.backupSecondaryRootDir || null,
    secondaryConfigured: !!env.backupSecondaryRootDir,
    databasePath: env.databaseFilePath,
    keepCount: Math.max(env.backupKeepCount, 1),
    intervalHours: env.backupAutoIntervalHours,
    lastBackupAt: last?.createdAt ?? null,
    hoursSinceLast,
    isStale: hoursSinceLast === null || hoursSinceLast > staleAfterHours,
    backups,
  };
}

export async function createBackup(trigger: BackupTrigger, userId: string | null): Promise<BackupInfo> {
  if (backupRunning) throw Errors.backupInProgress();
  backupRunning = true;

  const name = timestampName();
  const targetDir = path.join(env.backupRootDir, name);

  try {
    fs.mkdirSync(targetDir, { recursive: true });

    // VACUUM INTO writes a consistent, complete copy even while the shop is
    // selling, which a plain file copy cannot guarantee (the -wal file).
    const dbCopy = path.join(targetDir, DB_FILE_NAME);
    await prisma.$executeRawUnsafe(`VACUUM INTO '${dbCopy.replace(/'/g, "''")}'`);

    // A backup that cannot be opened is worse than none, so check it right away.
    const integrity = await checkIntegrity(dbCopy);
    if (integrity !== "ok") {
      throw new Error(`The backup file failed its integrity check (${integrity}).`);
    }

    if (fs.existsSync(env.uploadsRootDir)) {
      fs.cpSync(env.uploadsRootDir, path.join(targetDir, "uploads"), { recursive: true });
    }

    const uploads = folderStats(path.join(targetDir, "uploads"));
    const info: BackupInfo = {
      name,
      createdAt: new Date().toISOString(),
      trigger,
      databaseBytes: fs.statSync(dbCopy).size,
      uploadFiles: uploads.files,
      uploadBytes: uploads.bytes,
      integrity,
      secondary: { configured: !!env.backupSecondaryRootDir, ok: false },
    };
    const writeManifest = () =>
      fs.writeFileSync(path.join(targetDir, "manifest.json"), JSON.stringify(info, null, 2));
    writeManifest();

    // Second copy (USB drive / cloud-synced folder). If it is unavailable the
    // local backup still stands, and the problem is reported instead of hidden.
    if (env.backupSecondaryRootDir) {
      try {
        fs.mkdirSync(env.backupSecondaryRootDir, { recursive: true });
        fs.cpSync(targetDir, path.join(env.backupSecondaryRootDir, name), { recursive: true });
        pruneOldBackups(env.backupSecondaryRootDir);
        info.secondary.ok = true;
      } catch (err) {
        info.secondary.error = err instanceof Error ? err.message : String(err);
        logger.warn("Could not copy the backup to the second location", {
          location: env.backupSecondaryRootDir,
          error: info.secondary.error,
        });
      }
      writeManifest();
    }

    pruneOldBackups(env.backupRootDir);

    logger.info("Backup created", {
      name,
      trigger,
      databaseBytes: info.databaseBytes,
      uploadFiles: info.uploadFiles,
      secondaryOk: info.secondary.ok,
    });

    if (userId) {
      try {
        await recordAuditLog(prisma, {
          userId,
          action: "BACKUP_CREATED",
          entity: "Backup",
          entityId: name,
          newData: { trigger, uploadFiles: info.uploadFiles, secondaryOk: info.secondary.ok },
        });
      } catch (err) {
        logger.warn("Backup saved but the audit entry failed", { error: String(err) });
      }
    }

    return info;
  } catch (err) {
    // Never leave a half-written folder behind that could be mistaken for a good backup.
    fs.rmSync(targetDir, { recursive: true, force: true });
    const reason = err instanceof Error ? err.message : String(err);
    logger.error("Backup failed", { name, error: reason });
    throw Errors.backupFailed(reason);
  } finally {
    backupRunning = false;
  }
}

/**
 * Backs up shortly after the API starts when the newest backup is older than
 * the configured interval, then re-checks every hour. A shop that opens every
 * morning therefore gets a fresh backup each day without anyone remembering.
 */
export function startBackupScheduler() {
  if (env.backupAutoIntervalHours <= 0) {
    logger.info("Automatic backups are turned off (BACKUP_AUTO_INTERVAL_HOURS=0).");
    return;
  }

  const check = async () => {
    try {
      const last = listBackups()[0];
      const ageHours = last ? (Date.now() - Date.parse(last.createdAt)) / 3_600_000 : Infinity;
      if (ageHours >= env.backupAutoIntervalHours) {
        await createBackup("AUTO", null);
      }
    } catch (err) {
      logger.error("Automatic backup failed", { error: err instanceof Error ? err.message : String(err) });
    }
  };

  // Not during startup, so the first screen loads quickly.
  setTimeout(check, 30_000).unref();
  setInterval(check, 60 * 60 * 1000).unref();
}