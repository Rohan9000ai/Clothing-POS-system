import type { ExpenseType } from "@muzammil-pos/types";

/**
 * OPERATING          running costs of the shop
 * TAXES_AND_OTHER    taxes and miscellaneous
 * SUPPLIER_PAYMENT   money paid to suppliers for stock. NOT a cost in the profit
 *                    calculation: the cost of that stock reaches profit as "cost of
 *                    goods" when the pieces are sold, so counting it here too
 *                    would charge the same money twice.
 */
export type ExpenseGroup = "OPERATING" | "TAXES_AND_OTHER" | "SUPPLIER_PAYMENT";

export const EXPENSE_GROUP: Record<ExpenseType, ExpenseGroup> = {
  ELECTRICITY: "OPERATING",
  SALARIES: "OPERATING",
  PAYOUTS: "OPERATING",
  TAXES: "TAXES_AND_OTHER",
  OTHER: "TAXES_AND_OTHER",
  SUPPLIER_PAYMENT: "SUPPLIER_PAYMENT",
};

export function groupOf(type: string): ExpenseGroup {
  return EXPENSE_GROUP[type as ExpenseType] ?? "OPERATING";
}