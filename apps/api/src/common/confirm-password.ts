import argon2 from "argon2";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../database/prisma";
import { Errors } from "./errors";
import { recordAuditLog } from "./audit-log";
import { logger } from "./logger";

const MAX_WRONG_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const wrongAttempts = new Map<string, number[]>();

async function check(req: Request): Promise<void> {
  if (!req.user) throw Errors.sessionExpired();
  const userId = req.user.id;

  const now = Date.now();
  const recent = (wrongAttempts.get(userId) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_WRONG_ATTEMPTS) throw Errors.tooManyPasswordAttempts();

  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });

  let ok = false;
  if (user && password) {
    try {
      ok = await argon2.verify(user.passwordHash, password);
    } catch {
      ok = false;
    }
  }

  if (!ok) {
    recent.push(now);
    wrongAttempts.set(userId, recent);
    try {
      await recordAuditLog(prisma, {
        userId,
        action: "DELETE_PASSWORD_FAILED",
        entity: "User",
        entityId: userId,
        newData: { path: req.originalUrl.split("?")[0] },
      });
    } catch (err) {
      logger.warn("Could not record the failed password check", { error: String(err) });
    }
    throw Errors.wrongPassword();
  }

  wrongAttempts.delete(userId);
}

/** Put this on a delete route, AFTER requireAuth and requireRole. The body must contain { password }. */
export function confirmAdminPassword(req: Request, _res: Response, next: NextFunction) {
  check(req).then(() => next(), next);
}