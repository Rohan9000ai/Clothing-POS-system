/**
 * Central Express error-handling middleware.
 *
 * Rule from docs/architecture/error-handling.md:
 * - Every error shows a clear, human-readable message (via messageKey → i18n)
 * - Every error also logs technical details for developers
 * - Unknown/unexpected errors are treated as SYSTEM errors and never leak
 *   raw stack traces to the client
 */

import type { NextFunction, Request, Response } from "express";
import { AppError } from "./errors";
import { logger } from "./logger";

export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    logger.error(`[${err.category}] ${err.code}: ${err.message}`, {
      path: req.path,
      method: req.method,
      details: err.details,
    });

    return res.status(err.statusCode).json({
      error: {
        category: err.category,
        code: err.code,
        messageKey: err.messageKey,
        message: err.message, // dev-facing fallback; UI should prefer messageKey via i18n
        details: err.details,
      },
    });
  }

  // Unknown/unexpected error — treat as a system error, never leak internals.
  const error = err instanceof Error ? err : new Error(String(err));
  logger.error(`[UNHANDLED] ${error.message}`, {
    path: req.path,
    method: req.method,
    stack: error.stack,
  });

  return res.status(500).json({
    error: {
      category: "SYSTEM",
      code: "UNEXPECTED_ERROR",
      messageKey: "errors.system.unexpected",
      message: "Something went wrong. Please try again.",
    },
  });
}

/**
 * Catches errors thrown inside async route handlers and forwards them to
 * the error middleware — Express doesn't do this automatically for
 * async/await handlers.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}