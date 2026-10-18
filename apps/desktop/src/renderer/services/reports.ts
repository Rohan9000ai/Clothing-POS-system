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

export interface StockQueryParams {
  categoryId?: string;
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

export interface FinancialReport {
  period: ReportPeriod;
  range: ReportRangeInfo;
  profitLoss: {
    netSales: number;
    cogs: number;
    grossProfit: number;
    grossMarginPercent: number | null;
    operatingExpenses: number;
    taxesAndOther: number;
    totalExpenses: number;
    netProfit: number;
    netMarginPercent: number | null;
    /** True while some sold pieces have no known cost, so profit looks higher than it is. */
    isEstimate: boolean;
  };
  cost: {
    coveragePercent: number;
    knownCostRevenue: number;
    unknownCostRevenue: number;
    bySource: { source: "PRODUCT_COST_PRICE" | "SUPPLIER_BILL" | "UNKNOWN"; quantity: number; revenue: number }[];
    gaps: { productId: string; name: string; quantity: number; revenue: number }[];
  };
  expenses: {
    byType: {
      type: ExpenseType;
      group: string;
      inProfitLoss: boolean;
      amount: number;
      count: number;
      sharePercent: number;
    }[];
    profitLossTotal: number;
    supplierPayments: number;
    allExpensesTotal: number;
    count: number;
  };
  cash: { collected: number; expensesPaid: number; netCash: number };
  billCount: number;
  daily: {
    date: string;
    netSales: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    supplierPayments: number;
    netProfit: number;
  }[];
  previous: {
    from: string;
    to: string;
    netSales: number;
    cogs: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    netSalesChangePercent: number | null;
    totalExpensesChangePercent: number | null;
    netProfitChangePercent: number | null;
  };
  voided: {
    sales: { billCount: number; amount: number };
    expenses: { count: number; amount: number };
  };
  generatedAt: string;
}

export interface StockProductRow {
  productId: string;
  name: string;
  productCode: string;
  categoryName: string | null;
  status: "ACTIVE" | "INACTIVE";
  variantCount: number;
  pieces: number;
  costValue: number;
  retailValue: number;
  unknownCostPieces: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface StockReport {
  categoryFilter: { id: string; name: string } | null;
  summary: {
    productCount: number;
    variantCount: number;
    totalPieces: number;
    inventoryValueAtCost: number;
    inventoryValueAtRetail: number;
    potentialProfit: number;
    costCoveragePercent: number;
    piecesWithUnknownCost: number;
    lowStockThreshold: number;
    lowStockCount: number;
    outOfStockCount: number;
    inactivePieces: number;
    inactiveValueAtCost: number;
  };
  lowStock: {
    variantId: string;
    productId: string;
    productName: string;
    productCode: string;
    size: string;
    color: string;
    quantity: number;
    isOut: boolean;
  }[];
  byCategory: {
    categoryId: string;
    name: string;
    productCount: number;
    pieces: number;
    costValue: number;
    retailValue: number;
    sharePercent: number;
  }[];
  products: StockProductRow[];
  costGaps: { productId: string; name: string; pieces: number; retailValue: number }[];
  generatedAt: string;
}

export interface ReceivablesReport {
  asOf: string;
  summary: {
    totalOutstanding: number;
    billCount: number;
    customerCount: number;
    totalBilled: number;
    totalPaid: number;
    partialCount: number;
    unpaidCount: number;
    oldestDays: number | null;
    oldestBillNo: string | null;
  };
  aging: { key: string; label: string; billCount: number; amount: number; sharePercent: number }[];
  byCustomer: {
    customerId: string;
    name: string;
    billCount: number;
    outstanding: number;
    oldestDays: number;
    sharePercent: number;
  }[];
  bills: {
    saleId: string;
    billNo: string;
    saleDate: string;
    customerName: string;
    salesmanName: string | null;
    netTotal: number;
    paid: number;
    outstanding: number;
    paymentStatus: "PARTIAL" | "UNPAID";
    daysOpen: number;
  }[];
  generatedAt: string;
}

export interface PayablesReport {
  summary: {
    supplierCount: number;
    owedSupplierCount: number;
    settledSupplierCount: number;
    advanceSupplierCount: number;
    totalOwed: number;
    totalAdvance: number;
    netPayable: number;
    totalOpening: number;
    totalPurchased: number;
    totalPaid: number;
  };
  suppliers: {
    supplierId: string;
    name: string;
    phone: string;
    status: "ACTIVE" | "INACTIVE";
    openingBalance: number;
    purchases: number;
    adjustments: number;
    totalBalance: number;
    paid: number;
    remaining: number;
    lastPaymentDate: string | null;
    lastPurchaseDate: string | null;
    sharePercent: number;
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

function stockQueryString(params: StockQueryParams): string {
  const query = new URLSearchParams({ topN: String(params.topN ?? 10) });
  if (params.categoryId) query.set("categoryId", params.categoryId);
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
  async financial(params: ReportQueryParams): Promise<FinancialReport> {
    const res = await apiRequest<{ report: FinancialReport }>(`/reports/financial?${toQueryString(params)}`);
    return res.report;
  },
  async stock(params: StockQueryParams): Promise<StockReport> {
    const res = await apiRequest<{ report: StockReport }>(`/reports/stock?${stockQueryString(params)}`);
    return res.report;
  },
  async receivables(): Promise<ReceivablesReport> {
    const res = await apiRequest<{ report: ReceivablesReport }>("/reports/receivables");
    return res.report;
  },
  async payables(): Promise<PayablesReport> {
    const res = await apiRequest<{ report: PayablesReport }>("/reports/payables");
    return res.report;
  },
};