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
import multer from "multer";
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

  // File uploads: multer's own errors (too large, too many files, etc.)
  if (err instanceof multer.MulterError) {
    logger.error(`[UPLOAD] ${err.code}: ${err.message}`, { path: req.path, method: req.method });
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Image file is too large."
        : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE"
          ? "Too many image files uploaded at once (max 5)."
          : "Image upload failed.";
    return res.status(400).json({
      error: {
        category: "INPUT",
        code: `UPLOAD_${err.code}`,
        messageKey: "errors.input.invalidImageFile",
        message,
      },
    });
  }

  // File uploads: our own file-type rejection from common/upload.ts's fileFilter
  if (err instanceof Error && err.message === "INVALID_IMAGE_FILE") {
    logger.error("[UPLOAD] Rejected file with invalid type", { path: req.path, method: req.method });
    return res.status(400).json({
      error: {
        category: "INPUT",
        code: "INVALID_IMAGE_FILE",
        messageKey: "errors.input.invalidImageFile",
        message: "Only JPG, PNG or WEBP images are allowed.",
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