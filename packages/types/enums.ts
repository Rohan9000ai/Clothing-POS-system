/**
 * "Enum" values for Muzammil Store POS.
 *
 * SQLite has no native enum type, so these fields are plain String columns
 * in Prisma (see apps/api/prisma/schema.prisma). This file is the single
 * source of truth for the allowed values — used for TypeScript types AND
 * as the basis for the Zod enums in packages/validation.
 */

export const USER_ROLES = ["ADMIN", "CASHIER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const STATUS = ["ACTIVE", "INACTIVE"] as const;
export type Status = (typeof STATUS)[number];

export const SUPPLIER_TXN_TYPES = ["PURCHASE", "PAYMENT", "ADJUSTMENT"] as const;
export type SupplierTxnType = (typeof SUPPLIER_TXN_TYPES)[number];

export const PAYOUT_METHODS = ["CASH", "ONLINE_TRANSFER"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export const SALE_PAYMENT_METHODS = [
  "CASH",
  "EASYPAISA",
  "JAZZCASH",
  "BANK_TRANSFER",
] as const;
export type SalePaymentMethod = (typeof SALE_PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ["PAID", "PARTIAL", "UNPAID"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SALE_STATUSES = ["COMPLETED", "VOID"] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const EXPENSE_TYPES = [
  "ELECTRICITY",
  "SALARIES",
  "PAYOUTS",
  "SUPPLIER_PAYMENT",
  "TAXES",
  "OTHER",
] as const;
export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export const EXPENSE_STATUSES = ["ACTIVE", "VOID"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const INVENTORY_MOVEMENT_TYPES = [
  "SALE",
  "PURCHASE",
  "ADJUSTMENT",
  "RETURN",
  "VOID",
] as const;
export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];