import type { Sale } from "@muzammil-pos/types";
import type { CreateSaleInput } from "@muzammil-pos/validation";
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

export const salesApi = {
  async create(input: CreateSaleInput): Promise<SaleDetail> {
    const res = await apiRequest<{ sale: SaleDetail }>("/sales", { method: "POST", body: input });
    return res.sale;
  },
  async get(id: string): Promise<SaleDetail> {
    const res = await apiRequest<{ sale: SaleDetail }>(`/sales/${id}`);
    return res.sale;
  },
};