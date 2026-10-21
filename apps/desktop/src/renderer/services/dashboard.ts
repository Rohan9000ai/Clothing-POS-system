import type { PaymentStatus, SalePaymentMethod } from "@muzammil-pos/types";
import { apiRequest } from "./http";

export interface DashboardSale {
  saleId: string;
  billNo: string;
  saleDate: string;
  customerName: string;
  paymentMethods: SalePaymentMethod[];
  paymentStatus: PaymentStatus;
  netTotal: number;
  salesman: { id: string; name: string } | null;
}

export interface DashboardLowStockItem {
  variantId: string;
  productId: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
}

export interface DashboardData {
  /** The shop's "today", YYYY-MM-DD. */
  todayDate: string;
  generatedAt: string;
  today: {
    netSales: number;
    billCount: number;
    expensesTotal: number;
    expensesCount: number;
    /** The part of today's expenses that was paid to suppliers. */
    supplierPayments: number;
  };
  yesterday: { netSales: number; billCount: number; expensesTotal: number };
  stock: { totalPieces: number; productCount: number; variantCount: number };
  salesLast7Days: {
    total: { netSales: number; billCount: number };
    /** Oldest day first; the last entry is today. */
    daily: { date: string; netSales: number; billCount: number }[];
  };
  recentSales: DashboardSale[];
  lowStock: {
    threshold: number;
    total: number;
    outOfStock: number;
    items: DashboardLowStockItem[];
  };
}

export const dashboardApi = {
  async get(): Promise<DashboardData> {
    const res = await apiRequest<{ dashboard: DashboardData }>("/dashboard");
    return res.dashboard;
  },
};