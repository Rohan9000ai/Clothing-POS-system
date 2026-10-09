import type { CreateSupplierPurchaseInput, VoidSupplierPurchaseInput } from "@muzammil-pos/validation";
import { apiRequest } from "./http";

export interface SupplierPurchaseItemDetail {
  id: string;
  productId: string;
  variantId: string;
  productNameSnapshot: string;
  sizeSnapshot: string;
  colorSnapshot: string;
  quantity: number;
  unitCost: number; // paisa, per piece
  lineTotal: number; // paisa
}

export interface SupplierPurchaseDetail {
  id: string;
  supplierId: string;
  billNo: string | null;
  purchaseDate: string;
  totalAmount: number; // paisa
  notes: string | null;
  status: "ACTIVE" | "VOID";
  createdAt: string;
  createdBy: { id: string; fullName: string; username: string };
  items: SupplierPurchaseItemDetail[];
}

export const supplierPurchasesApi = {
  async list(supplierId: string): Promise<SupplierPurchaseDetail[]> {
    const res = await apiRequest<{ purchases: SupplierPurchaseDetail[] }>(`/suppliers/${supplierId}/purchases`);
    return res.purchases;
  },
  async create(supplierId: string, input: CreateSupplierPurchaseInput): Promise<SupplierPurchaseDetail> {
    const res = await apiRequest<{ purchase: SupplierPurchaseDetail }>(`/suppliers/${supplierId}/purchases`, {
      method: "POST",
      body: input,
    });
    return res.purchase;
  },
  async void(
    supplierId: string,
    purchaseId: string,
    input: VoidSupplierPurchaseInput
  ): Promise<SupplierPurchaseDetail> {
    const res = await apiRequest<{ purchase: SupplierPurchaseDetail }>(
      `/suppliers/${supplierId}/purchases/${purchaseId}/void`,
      { method: "POST", body: input }
    );
    return res.purchase;
  },
};