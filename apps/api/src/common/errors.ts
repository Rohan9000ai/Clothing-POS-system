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
  cannotRemoveLastAdmin: () =>
    new BusinessError(
      "CANNOT_REMOVE_LAST_ADMIN",
      "errors.business.cannotRemoveLastAdmin",
      "This is the only active admin account. Activate or create another admin before disabling, deleting, or changing this account's role."
    ),
  userHasRelatedRecords: (username: string) =>
    new BusinessError(
      "USER_HAS_RELATED_RECORDS",
      "errors.business.userHasRelatedRecords",
      `User "${username}" has existing sales, expenses, or other records and cannot be permanently deleted. Deactivate the account instead.`
    ),
  categoryHasProducts: (categoryName: string) =>
    new BusinessError(
      "CATEGORY_HAS_PRODUCTS",
      "errors.business.categoryHasProducts",
      `Category "${categoryName}" has products assigned to it and cannot be deleted. Deactivate it instead.`
    ),
  productHasRelatedRecords: (productName: string) =>
    new BusinessError(
      "PRODUCT_HAS_RELATED_RECORDS",
      "errors.business.productHasRelatedRecords",
      `Product "${productName}" has variants or sales history and cannot be permanently deleted. Deactivate it instead.`
    ),
  duplicateVariant: (size: string, color: string) =>
    new BusinessError(
      "DUPLICATE_VARIANT",
      "errors.business.duplicateVariant",
      `A variant with size "${size}" and color "${color}" already exists for this product.`,
      { size, color }
    ),
  variantHasRelatedRecords: (variantLabel: string) =>
    new BusinessError(
      "VARIANT_HAS_RELATED_RECORDS",
      "errors.business.variantHasRelatedRecords",
      `Variant "${variantLabel}" has sales history and cannot be permanently deleted. Deactivate it instead.`
    ),
  adjustmentWouldGoNegative: (variantLabel: string, currentQuantity: number, quantityChange: number) =>
    new BusinessError(
      "ADJUSTMENT_WOULD_GO_NEGATIVE",
      "errors.business.adjustmentWouldGoNegative",
      `Cannot adjust "${variantLabel}" by ${quantityChange}: current stock is ${currentQuantity}, which would go below zero.`,
      { currentQuantity, quantityChange }
    ),
  productNotSellable: (productName: string) =>
    new BusinessError(
      "PRODUCT_NOT_SELLABLE",
      "errors.business.productNotSellable",
      `Product "${productName}" is inactive and cannot be sold.`
    ),
  variantNotSellable: (variantLabel: string) =>
    new BusinessError(
      "VARIANT_NOT_SELLABLE",
      "errors.business.variantNotSellable",
      `Variant "${variantLabel}" is inactive and cannot be sold.`
    ),
  inactiveSalesman: (name: string) =>
    new BusinessError(
      "INACTIVE_SALESMAN",
      "errors.business.inactiveSalesman",
      `Salesman "${name}" is inactive and cannot be assigned to a sale.`
    ),
  paymentExceedsNetTotal: (paidTotal: number, netTotal: number) =>
    new BusinessError(
      "PAYMENT_EXCEEDS_NET_TOTAL",
      "errors.business.paymentExceedsNetTotal",
      `Total payments (${paidTotal}) cannot exceed the net total (${netTotal}).`,
      { paidTotal, netTotal }
    ),
  saleAlreadyVoided: (billNo: string) =>
    new BusinessError(
      "SALE_ALREADY_VOIDED",
      "errors.business.saleAlreadyVoided",
      `Sale "${billNo}" has already been voided.`
    ),
};