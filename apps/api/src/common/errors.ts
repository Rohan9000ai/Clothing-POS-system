/**
 * Application error hierarchy, matching the 5 categories defined in
 * docs/architecture/error-handling.md:
 *   1. Input errors
 *   2. Business errors
 *   3. Authentication errors
 *   4. Hardware errors
 *   5. System errors
 *
 * `messageKey` maps to an i18n string (en/ur) so the same error renders
 * correctly in whichever language the UI is currently using. `message`
 * is a developer-facing fallback, never shown directly to shop staff.
 */

export type ErrorCategory =
  | "INPUT"
  | "BUSINESS"
  | "AUTH"
  | "HARDWARE"
  | "SYSTEM";

export interface AppErrorOptions {
  category: ErrorCategory;
  code: string; // machine-readable, e.g. "INSUFFICIENT_STOCK"
  messageKey: string; // i18n key, e.g. "errors.business.insufficientStock"
  message: string; // developer-facing fallback message
  statusCode: number; // HTTP status to respond with
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  category: ErrorCategory;
  code: string;
  messageKey: string;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.category = options.category;
    this.code = options.code;
    this.messageKey = options.messageKey;
    this.statusCode = options.statusCode;
    this.details = options.details;
  }
}

// ---- Category 1: Input errors (400) ----
export class InputError extends AppError {
  constructor(code: string, messageKey: string, message: string, details?: Record<string, unknown>) {
    super({ category: "INPUT", code, messageKey, message, statusCode: 400, details });
  }
}

// ---- Category 2: Business errors (409 — conflict with current state) ----
export class BusinessError extends AppError {
  constructor(code: string, messageKey: string, message: string, details?: Record<string, unknown>) {
    super({ category: "BUSINESS", code, messageKey, message, statusCode: 409, details });
  }
}

// ---- Category 3: Authentication errors (401 / 403) ----
export class AuthError extends AppError {
  constructor(
    code: string,
    messageKey: string,
    message: string,
    statusCode: 401 | 403 = 401,
    details?: Record<string, unknown>
  ) {
    super({ category: "AUTH", code, messageKey, message, statusCode, details });
  }
}

// ---- Category 4: Hardware errors (503 — service unavailable) ----
export class HardwareError extends AppError {
  constructor(code: string, messageKey: string, message: string, details?: Record<string, unknown>) {
    super({ category: "HARDWARE", code, messageKey, message, statusCode: 503, details });
  }
}

// ---- Category 5: System errors (500) ----
export class SystemError extends AppError {
  constructor(code: string, messageKey: string, message: string, details?: Record<string, unknown>) {
    super({ category: "SYSTEM", code, messageKey, message, statusCode: 500, details });
  }
}

// ---- Common, ready-to-throw error instances used across modules ----
export const Errors = {
  notFound: (entity: string, id: string) =>
    new InputError(
      "NOT_FOUND",
      "errors.input.notFound",
      `${entity} with id "${id}" not found.`,
      { entity, id }
    ),
  validation: (message: string, details?: Record<string, unknown>) =>
    new InputError("VALIDATION_FAILED", "errors.input.validation", message, details),
  insufficientStock: (variantId: string, requested: number, available: number) =>
    new BusinessError(
      "INSUFFICIENT_STOCK",
      "errors.business.insufficientStock",
      `Insufficient stock for variant "${variantId}": requested ${requested}, available ${available}.`,
      { variantId, requested, available }
    ),
  invalidCredentials: () =>
    new AuthError(
      "INVALID_CREDENTIALS",
      "errors.auth.invalidCredentials",
      "Incorrect username or password.",
      401
    ),
  inactiveUser: () =>
    new AuthError(
      "INACTIVE_USER",
      "errors.auth.inactiveUser",
      "This user account is inactive.",
      403
    ),
  unauthorizedRole: (requiredRole: string) =>
    new AuthError(
      "UNAUTHORIZED_ROLE",
      "errors.auth.unauthorizedRole",
      `This action requires role: ${requiredRole}.`,
      403,
      { requiredRole }
    ),
  sessionExpired: () =>
    new AuthError(
      "SESSION_EXPIRED",
      "errors.auth.sessionExpired",
      "Session has expired. Please log in again.",
      401
    ),
  printerNotConnected: () =>
    new HardwareError(
      "PRINTER_NOT_CONNECTED",
      "errors.hardware.printerNotConnected",
      "Thermal printer is not connected."
    ),
  databaseUnavailable: (details?: Record<string, unknown>) =>
    new SystemError(
      "DATABASE_UNAVAILABLE",
      "errors.system.databaseUnavailable",
      "Database is currently unavailable.",
      details
    ),
};