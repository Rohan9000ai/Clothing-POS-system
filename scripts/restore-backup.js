#!/usr/bin/env node
/**
 * Restores a backup made by the app.
 *
 *   npm run db:restore                      -> lists the backups
 *   npm run db:restore -- <backup-name>     -> restores one from the backups folder
 *   npm run db:restore -- /path/to/folder   -> restores one from anywhere (e.g. a USB drive)
 *
 * Before touching anything it saves your CURRENT data to
 * <backups folder>/before-restore_<time>, so a restore can always be undone.
 * Plain Node, no packages needed.
 */
const fs = require("fs");
const path = require("path");
const net = require("net");
const readline = require("readline");

const apiRoot = path.resolve(__dirname, "../apps/api");
const DB_FILE_NAME = "muzammil_store.db";
const NAME_PATTERN = /^muzammil_store_backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;

function fail(message) {
  console.error(`\nERROR: ${message}\n`);
  process.exit(1);
}

function readEnvFile() {
  const file = path.join(apiRoot, ".env");
  if (!fs.existsSync(file)) fail(`Cannot find ${file}`);
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = readEnvFile();
if (!env.DATABASE_URL) fail("DATABASE_URL is missing from apps/api/.env");

// Prisma resolves a relative SQLite path against apps/api/prisma.
const rawDb = env.DATABASE_URL.replace(/^file:/, "").split("?")[0].trim();
const dbFile = path.isAbsolute(rawDb) ? rawDb : path.resolve(apiRoot, "prisma", rawDb);
const uploadsDir = path.resolve(apiRoot, env.UPLOADS_DIR || "../../database/uploads");
const backupDir = path.resolve(apiRoot, env.BACKUP_DIR || "../../database/backups");
const apiPort = Number(env.API_PORT || 4310);

function listBackupNames(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && NAME_PATTERN.test(e.name))
    .map((e) => e.name)
    .sort()
    .reverse();
}

function readManifest(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  } catch {
    return null;
  }
}

function isApiRunning(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    setTimeout(() => done(false), 800);
  });
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

async function main() {
  const arg = process.argv[2];

  if (!arg) {
    const names = listBackupNames(backupDir);
    console.log(`\nBackups in ${backupDir}\n`);
    if (names.length === 0) console.log("  (none found)");
    for (const name of names) {
      const m = readManifest(path.join(backupDir, name));
      const detail = m
        ? `${m.trigger}, ${m.uploadFiles} pictures, check: ${m.integrity}, second copy: ${m.secondary && m.secondary.ok ? "yes" : "no"}`
        : "no details";
      console.log(`  ${name}   (${detail})`);
    }
    console.log("\nTo restore one:  npm run db:restore -- <backup-name>");
    console.log("From a USB drive: npm run db:restore -- /path/to/that/backup/folder\n");
    return;
  }

  const source = fs.existsSync(arg) && fs.statSync(arg).isDirectory() ? path.resolve(arg) : path.join(backupDir, arg);
  if (!fs.existsSync(path.join(source, DB_FILE_NAME))) {
    fail(`"${source}" does not contain ${DB_FILE_NAME}. Run "npm run db:restore" to see the available backups.`);
  }

  if (await isApiRunning(apiPort)) {
    fail(`The API is running on port ${apiPort}. Stop it first (Ctrl+C in its terminal), then run this again.`);
  }

  const manifest = readManifest(source);
  console.log("\nRestore from:", source);
  if (manifest) console.log(`  Taken: ${manifest.createdAt}   Pictures: ${manifest.uploadFiles}   Check: ${manifest.integrity}`);
  console.log("This will REPLACE the current database:", dbFile);
  console.log("Your current data is saved first, so this can be undone.\n");

  const answer = await ask("Type RESTORE to continue: ");
  if (answer.trim() !== "RESTORE") {
    console.log("Cancelled. Nothing was changed.");
    return;
  }

  // 1. Safety copy of what exists right now.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safetyDir = path.join(backupDir, `before-restore_${stamp}`);
  fs.mkdirSync(safetyDir, { recursive: true });
  for (const suffix of ["", "-wal", "-shm"]) {
    if (fs.existsSync(dbFile + suffix)) fs.copyFileSync(dbFile + suffix, path.join(safetyDir, DB_FILE_NAME + suffix));
  }
  if (fs.existsSync(uploadsDir)) fs.cpSync(uploadsDir, path.join(safetyDir, "uploads"), { recursive: true });
  console.log("Saved your current data to:", safetyDir);

  // 2. Replace the database. Stale -wal/-shm files must go, or they would be applied to the restored file.
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(dbFile + suffix, { force: true });
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  fs.copyFileSync(path.join(source, DB_FILE_NAME), dbFile);

  // 3. Bring the pictures back. Existing files are kept, backed-up ones are put back.
  const sourceUploads = path.join(source, "uploads");
  if (fs.existsSync(sourceUploads)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.cpSync(sourceUploads, uploadsDir, { recursive: true, force: true });
  }

  console.log("\nRestore complete.");
  console.log("If this backup came from an older version of the app, run once:");
  console.log("  cd apps/api && npm run db:migrate:deploy");
  console.log("Then start the API again.\n");
}

main().catch((err) => fail(err.message));