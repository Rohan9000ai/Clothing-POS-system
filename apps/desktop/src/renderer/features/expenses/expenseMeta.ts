import { EXPENSE_TYPES, PAYOUT_METHODS } from "@muzammil-pos/types";
import type { ExpenseType, PayoutMethod } from "@muzammil-pos/types";

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  ELECTRICITY: "Electricity bill",
  SALARIES: "Salesman salary",
  PAYOUTS: "Payout",
  SUPPLIER_PAYMENT: "Paid to supplier",
  TAXES: "Taxes",
  OTHER: "Other",
};

export const PAYMENT_METHOD_LABELS: Record<PayoutMethod, string> = {
  CASH: "Cash",
  ONLINE_TRANSFER: "Online transfer",
};

export const EXPENSE_TYPE_OPTIONS = EXPENSE_TYPES.map((type) => ({
  value: type,
  label: EXPENSE_TYPE_LABELS[type],
}));

export const PAYMENT_METHOD_OPTIONS = PAYOUT_METHODS.map((method) => ({
  value: method,
  label: PAYMENT_METHOD_LABELS[method],
}));