import type { Supplier, SupplierTransaction } from "@muzammil-pos/types";
import type { CreateSupplierInput, UpdateSupplierInput } from "@muzammil-pos/validation";
import { apiRequest } from "./http";

export interface SupplierBalance {
  openingBalance: number;
  totalPurchases: number;
  totalPayments: number;
  totalAdjustments: number;
  totalBalance: number;
  givenBalance: number;
  remainingBalance: number;
}

export interface SupplierWithBalance extends Supplier {
  balance: SupplierBalance;
}

export interface SupplierDetail extends SupplierWithBalance {
  transactions: (SupplierTransaction & { createdBy: { id: string; fullName: string; username: string } })[];
}

export const suppliersApi = {
  async list(): Promise<SupplierWithBalance[]> {
    const res = await apiRequest<{ suppliers: SupplierWithBalance[] }>("/suppliers");
    return res.suppliers;
  },
  async get(id: string): Promise<SupplierDetail> {
    const res = await apiRequest<{ supplier: SupplierDetail }>(`/suppliers/${id}`);
    return res.supplier;
  },
  async create(input: CreateSupplierInput): Promise<Supplier> {
    const res = await apiRequest<{ supplier: Supplier }>("/suppliers", { method: "POST", body: input });
    return res.supplier;
  },
  async update(id: string, input: UpdateSupplierInput): Promise<Supplier> {
    const res = await apiRequest<{ supplier: Supplier }>(`/suppliers/${id}`, {
      method: "PATCH",
      body: input,
    });
    return res.supplier;
  },
  async setStatus(id: string, status: "ACTIVE" | "INACTIVE"): Promise<Supplier> {
    const res = await apiRequest<{ supplier: Supplier }>(`/suppliers/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
    return res.supplier;
  },
  async remove(id: string): Promise<void> {
    await apiRequest(`/suppliers/${id}`, { method: "DELETE" });
  },
};