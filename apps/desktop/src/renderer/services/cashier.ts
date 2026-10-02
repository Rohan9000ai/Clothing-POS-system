import { apiRequest } from "./http";

export interface CashierProductVariant {
  id: string;
  size: string;
  color: string;
  variantSku: string;
  quantity: number;
  priceOverride: number | null;
}

export interface CashierProduct {
  id: string;
  productCode: string;
  name: string;
  basePrice: number;
  primaryImageUrl: string | null;
  category: { id: string; name: string } | null;
  variants: CashierProductVariant[];
}

export const cashierApi = {
  async listProducts(search?: string): Promise<CashierProduct[]> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await apiRequest<{ products: CashierProduct[] }>(`/inventory/cashier-products${qs}`);
    return res.products;
  },
};