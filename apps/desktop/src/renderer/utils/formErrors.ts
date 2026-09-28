import { HttpError } from "../services/http";

/** Converts a Zod error (from safeParse) into { fieldName: firstMessage }. */
export function zodFieldErrors(error: {
  issues: Array<{ path: Array<string | number>; message: string }>;
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Pulls per-field messages out of a server error, so backend validation
 * (e.g. "Username is already taken") shows under the right input.
 */
export function getFieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof HttpError) || !err.details) return {};

  const out: Record<string, string> = {};

  const fieldErrors = err.details.fieldErrors as Record<string, string[]> | undefined;
  if (fieldErrors) {
    for (const [key, messages] of Object.entries(fieldErrors)) {
      const first = messages?.[0];
      if (first) out[key] = first;
    }
  }

  const singleField = err.details.field;
  if (typeof singleField === "string") {
    out[singleField] = err.message;
  }

  return out;
}