import * as fs from "fs";
import * as path from "path";
import { execFile } from "child_process";
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
  /** Result of copying this backup to the second location (folder and/or cloud). */
  secondary: { configured: boolean; ok: boolean; error?: string };
}

const BACKUP_NAME_PATTERN = /^muzammil_store_backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;
const DB_FILE_NAME = "muzammil_store.db";

/** Accepts "remotename:folder/path", e.g. gdrive:muzammil-backups. */
const RCLONE_REMOTE_PATTERN = /^[A-Za-z0-9_.-]+:[A-Za-z0-9_./ -]*$/;
const RCLONE_TIMEOUT_MS = 10 * 60 * 1000;
// Fail fast when the internet is down instead of hanging for minutes.
const RCLONE_SAFETY_FLAGS = ["--retries", "2", "--low-level-retries", "3", "--contimeout", "20s", "--timeout", "2m"];

let backupRunning = false;

function hasSecondaryTarget(): boolean {
  return !!(env.backupSecondaryRootDir || env.backupRcloneRemote);
}

function timestampName(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `muzammil_store_backup_${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
    `_${p(date.getHours())}-${p(date.getMinutes())}-${p(date.getSeconds())}`
  );
}

/** A backup name that doesn't exist yet. Two backups in the same second must never share a folder. */
function uniqueBackupName(): string {
  let when = new Date();
  for (let i = 0; i < 3600; i++) {
    const candidate = timestampName(when);
    if (!fs.existsSync(path.join(env.backupRootDir, candidate))) return candidate;
    when = new Date(when.getTime() + 1000);
  }
  return timestampName(when);
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

// ---------------------------------------------------------------------------
// Second copy: a folder (USB / synced folder) and/or a cloud remote via rclone
// ---------------------------------------------------------------------------

function runRclone(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // execFile with an argument list (no shell), so nothing here can be injected.
    execFile(
      "rclone",
      [...args, ...RCLONE_SAFETY_FLAGS],
      { timeout: RCLONE_TIMEOUT_MS, windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            reject(new Error("rclone is not installed or not on PATH."));
            return;
          }
          const detail = String(stderr || stdout || error.message).trim().split("\n").slice(-3).join(" ");
          reject(new Error(detail || error.message));
          return;
        }
        resolve(String(stdout));
      }
    );
  });
}

async function copyToRclone(sourceDir: string, name: string): Promise<void> {
  const remote = env.backupRcloneRemote;
  if (!RCLONE_REMOTE_PATTERN.test(remote)) {
    throw new Error(`BACKUP_RCLONE_REMOTE "${remote}" is not valid. Use the form name:folder, e.g. gdrive:muzammil-backups.`);
  }

  await runRclone(["copy", sourceDir, `${remote}/${name}`]);
  // Compare what is now in the cloud with the local backup. A copy that
  // doesn't match is not a backup.
  await runRclone(["check", sourceDir, `${remote}/${name}`, "--one-way"]);

  const listing = await runRclone(["lsf", "--dirs-only", remote]);
  const names = listing
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\/$/, ""))
    .filter((n) => BACKUP_NAME_PATTERN.test(n))
    .sort()
    .reverse();

  for (const old of names.slice(Math.max(env.backupKeepCount, 1))) {
    await runRclone(["purge", `${remote}/${old}`, "--drive-use-trash=false"]);
    logger.info("Removed old cloud backup", { name: old, remote });
  }
}

function copyToFolder(sourceDir: string, name: string) {
  fs.mkdirSync(env.backupSecondaryRootDir, { recursive: true });
  fs.cpSync(sourceDir, path.join(env.backupSecondaryRootDir, name), { recursive: true });
  pruneOldBackups(env.backupSecondaryRootDir);
}

/**
 * Copies one finished backup to every configured second location. Never
 * throws: if the USB/cloud is unavailable the local backup still stands, and
 * the problem is reported instead of hidden.
 */
async function copyBackupToSecondary(sourceDir: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const problems: string[] = [];

  if (env.backupSecondaryRootDir) {
    try {
      copyToFolder(sourceDir, name);
    } catch (err) {
      problems.push(`Folder ${env.backupSecondaryRootDir}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (env.backupRcloneRemote) {
    try {
      await copyToRclone(sourceDir, name);
    } catch (err) {
      problems.push(`Cloud ${env.backupRcloneRemote}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (problems.length > 0) {
    const error = problems.join(" | ");
    logger.warn("Could not copy the backup to the second location", { name, error });
    return { ok: false, error };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------

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
    rcloneRemote: env.backupRcloneRemote || null,
    secondaryConfigured: hasSecondaryTarget(),
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

  const name = uniqueBackupName();
  const targetDir = path.join(env.backupRootDir, name);
  let createdDir = false;

  try {
    fs.mkdirSync(targetDir, { recursive: true });
    createdDir = true;

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
      secondary: { configured: hasSecondaryTarget(), ok: false },
    };
    const writeManifest = () =>
      fs.writeFileSync(path.join(targetDir, "manifest.json"), JSON.stringify(info, null, 2));
    writeManifest();

    if (hasSecondaryTarget()) {
      const result = await copyBackupToSecondary(targetDir, name);
      info.secondary.ok = result.ok;
      if (result.error) info.secondary.error = result.error;
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
    // Remove a half-written folder so it can't be mistaken for a good backup,
    // but only one THIS run created. Never touch an earlier, good backup.
    if (createdDir) fs.rmSync(targetDir, { recursive: true, force: true });
    const reason = err instanceof Error ? err.message : String(err);
    logger.error("Backup failed", { name, error: reason });
    throw Errors.backupFailed(reason);
  } finally {
    backupRunning = false;
  }
}

/**
 * If the newest backup never reached the second location (internet down, USB
 * unplugged), try again without making a new backup.
 */
async function retryFailedSecondaryCopy() {
  if (backupRunning || !hasSecondaryTarget()) return;

  const last = listBackups()[0];
  if (!last || last.secondary.ok) return;

  backupRunning = true;
  try {
    const dir = path.join(env.backupRootDir, last.name);
    const result = await copyBackupToSecondary(dir, last.name);
    const updated: BackupInfo = {
      ...last,
      secondary: { configured: true, ok: result.ok, ...(result.error ? { error: result.error } : {}) },
    };
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(updated, null, 2));
    if (result.ok) logger.info("Second copy of the latest backup completed on retry", { name: last.name });
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
      } else {
        await retryFailedSecondaryCopy();
      }
    } catch (err) {
      logger.error("Automatic backup failed", { error: err instanceof Error ? err.message : String(err) });
    }
  };

  // Not during startup, so the first screen loads quickly.
  setTimeout(check, 30_000).unref();
  setInterval(check, 60 * 60 * 1000).unref();
}