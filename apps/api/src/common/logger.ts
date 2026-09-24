/**
 * Simple leveled logger — writes to console always, and to a daily log file
 * under LOG_DIR. No heavy dependency (e.g. winston/pino) needed yet at this
 * scale; can be swapped later without changing call sites since everything
 * goes through this module.
 */

import * as fs from "fs";
import * as path from "path";
import { env } from "./env";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function ensureLogDir(): string {
  const resolvedDir = path.resolve(__dirname, env.logDir);
  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }
  return resolvedDir;
}

function todayLogFilePath(): string {
  const dir = ensureLogDir();
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(dir, `muzammil-store-pos-${date}.log`);
}

function writeToFile(line: string) {
  try {
    fs.appendFileSync(todayLogFilePath(), line + "\n", { encoding: "utf-8" });
  } catch (err) {
    // Never let logging itself crash the app — fall back to console only.
    console.error("[logger] Failed to write log file:", err);
  }
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[env.logLevel];
}

function format(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const line = format(level, message, context);

  const consoleFn =
    level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  consoleFn(line);

  writeToFile(line);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
};