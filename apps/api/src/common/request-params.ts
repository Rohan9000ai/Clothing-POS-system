import type { Request } from "express";
import { Errors } from "./errors";

/**
 * Safely extracts a required route param as a string.
 *
 * Needed because our tsconfig has `noUncheckedIndexedAccess: true`, so
 * Express types req.params.<name> as `string | undefined` even for params
 * that are always present at runtime for a matched route. This throws a
 * proper InputError (rather than a TypeScript-silencing cast) in the
 * unreachable case it's actually missing.
 */
export function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) {
    throw Errors.validation(`Missing required route parameter: "${name}".`);
  }
  return value;
}