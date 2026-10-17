import type { ExpenseType, PayoutMethod, SalePaymentMethod } from "@muzammil-pos/types";
import { apiRequest } from "./http";

export type ReportPeriod = "day" | "week" | "month" | "custom";

export interface ReportQueryParams {
  period: ReportPeriod;
  /** Any day inside the wanted day/week/month (YYYY-MM-DD). */
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  /** How many rows to return in the "top" tables. Default 10. */
  topN?: number;
}

export interface ReportRangeInfo {
  from: string;
  to: string;
  days: number;
}

export interface ProductSalesRow {
  productId: string;
  name: string;
  productCode: string;
  categoryName: string | null;
  quantity: number;
  revenue: number;
  sharePercent: number;
}

export interface SalesReport {
  period: ReportPeriod;
  range: ReportRangeInfo;
  summary: {
    billCount: number;
    itemsSold: number;
    grossSales: number;
    discountTotal: number;
    netSales: number;
    averageBill: number;
    collected: number;
    outstanding: number;
    paidBills: number;
    partialBills: number;
    unpaidBills: number;
  };
  previous: {
    from: string;
    to: string;
    netSales: number;
    billCount: number;
    netSalesChangePercent: number | null;
    billCountChangePercent: number | null;
  };
  voided: { billCount: number; amount: number };
  highestSalesDay: { date: string; billCount: number; netSales: number } | null;
  daily: { date: string; billCount: number; netSales: number }[];
  byPaymentMethod: {
    method: SalePaymentMethod;
    amount: number;
    paymentCount: number;
    sharePercent: number;
  }[];
  byCashier: {
    cashierId: string;
    name: string;
    username: string;
    billCount: number;
    netSales: number;
    averageBill: number;
    sharePercent: number;
  }[];
  bySalesman: {
    salesmanId: string | null;
    name: string;
    billCount: number;
    netSales: number;
    averageBill: number;
    sharePercent: number;
  }[];
  topProducts: { byQuantity: ProductSalesRow[]; byRevenue: ProductSalesRow[] };
  generatedAt: string;
}

export interface ExpenseReport {
  period: ReportPeriod;
  range: ReportRangeInfo;
  summary: {
    total: number;
    count: number;
    average: number;
    /** Running costs that reduce profit (operating + taxes & other). */
    profitLossExpenses: number;
    operating: number;
    taxesAndOther: number;
    /** Paid to suppliers for stock. Shown, but not counted in profit. */
    supplierPayments: number;
  };
  previous: {
    from: string;
    to: string;
    total: number;
    count: number;
    totalChangePercent: number | null;
    countChangePercent: number | null;
  };
  voided: { count: number; amount: number };
  highestExpenseDay: { date: string; amount: number; count: number } | null;
  daily: { date: string; amount: number; count: number }[];
  byType: {
    type: ExpenseType;
    group: string;
    inProfitLoss: boolean;
    amount: number;
    count: number;
    sharePercent: number;
  }[];
  byPaymentMethod: { method: PayoutMethod; amount: number; count: number; sharePercent: number }[];
  largestExpenses: {
    id: string;
    date: string;
    title: string;
    type: ExpenseType;
    amount: number;
    paymentMethod: PayoutMethod;
    supplierName: string | null;
    salesmanName: string | null;
    inProfitLoss: boolean;
  }[];
  generatedAt: string;
}

function toQueryString(params: ReportQueryParams): string {
  const query = new URLSearchParams({ period: params.period, topN: String(params.topN ?? 10) });
  if (params.date) query.set("date", params.date);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  return query.toString();
}

export const reportsApi = {
  async sales(params: ReportQueryParams): Promise<SalesReport> {
    const res = await apiRequest<{ report: SalesReport }>(`/reports/sales?${toQueryString(params)}`);
    return res.report;
  },
  async expenses(params: ReportQueryParams): Promise<ExpenseReport> {
    const res = await apiRequest<{ report: ExpenseReport }>(`/reports/expenses?${toQueryString(params)}`);
    return res.report;
  },
};