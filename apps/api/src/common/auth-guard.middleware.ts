/**
 * Auth guards — see docs/architecture/error-handling.md, "Authentication
 * errors" category. requireAuth verifies the JWT and attaches req.user;
 * requireRole restricts a route to specific roles (ADMIN / CASHIER).
 */

import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "./jwt";
import { Errors } from "./errors";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(Errors.sessionExpired());
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      fullName: payload.fullName,
    };
    next();
  } catch {
    next(Errors.sessionExpired());
  }
}

/**
 * Restricts a route to one or more roles. Must be used AFTER requireAuth.
 * Usage: router.post("/", requireAuth, requireRole("ADMIN"), handler)
 */
export function requireRole(...roles: Array<"ADMIN" | "CASHIER">) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(Errors.sessionExpired());
    }
    if (!roles.includes(req.user.role as "ADMIN" | "CASHIER")) {
      return next(Errors.unauthorizedRole(roles.join(" or ")));
    }
    next();
  };
}