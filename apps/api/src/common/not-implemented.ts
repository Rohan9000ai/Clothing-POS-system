import type { Request, Response } from "express";

/**
 * Placeholder handler for module routes not yet built. Returns a clear
 * 501 response instead of a 404, so it's obvious during Day 3–4 testing
 * that the route exists and is simply pending implementation.
 */
export function notImplemented(moduleName: string) {
  return (_req: Request, res: Response) => {
    res.status(501).json({
      error: {
        category: "SYSTEM",
        code: "NOT_IMPLEMENTED",
        messageKey: "errors.system.notImplemented",
        message: `The "${moduleName}" module is scaffolded but not implemented yet.`,
      },
    });
  };
}