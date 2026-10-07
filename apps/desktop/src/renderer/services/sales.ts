import type { Sale, PaginatedResponse, SalePaymentMethod, SaleStatus } from "@muzammil-pos/types";
import type { CreateSaleInput, VoidSaleInput } from "@muzammil-pos/validation";
import { apiRequest } from "./http";

/**
 * The API includes these relations on every sale response (see
 * apps/api/src/modules/sales/sales.service.ts SALE_INCLUDE) — richer than
 * the base Sale type, which only has the raw foreign key ids.
 */
export interface SaleDetail extends Sale {
  customer: { id: string; name: string };
  salesman: { id: string; name: string } | null;
  cashier: { id: string; fullName: string; username: string };
}

export interface SaleListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: SaleStatus;
  paymentStatus?: string;
  cashierId?: string;
  salesmanId?: string;
  paymentMethod?: SalePaymentMethod;
  dateFrom?: string;
  dateTo?: string;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const key in params) {
    const value = params[key];
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const salesApi = {
  async create(input: CreateSaleInput): Promise<SaleDetail> {
    const res = await apiRequest<{ sale: SaleDetail }>("/sales", { method: "POST", body: input });
    return res.sale;
  },
  async get(id: string): Promise<SaleDetail> {
    const res = await apiRequest<{ sale: SaleDetail }>(`/sales/${id}`);
    return res.sale;
  },
  async list(params: SaleListParams = {}): Promise<PaginatedResponse<SaleDetail>> {
    return apiRequest<PaginatedResponse<SaleDetail>>(`/sales${buildQuery({ ...params })}`);
  },
  async void(id: string, input: VoidSaleInput): Promise<SaleDetail> {
    const res = await apiRequest<{ sale: SaleDetail }>(`/sales/${id}/void`, {
      method: "POST",
      body: input,
    });
    return res.sale;
  },
};