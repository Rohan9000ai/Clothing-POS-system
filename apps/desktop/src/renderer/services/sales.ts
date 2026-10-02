import type { Sale } from "@muzammil-pos/types";
import type { CreateSaleInput } from "@muzammil-pos/validation";
import { apiRequest } from "./http";

export const salesApi = {
  async create(input: CreateSaleInput): Promise<Sale> {
    const res = await apiRequest<{ sale: Sale }>("/sales", { method: "POST", body: input });
    return res.sale;
  },
};