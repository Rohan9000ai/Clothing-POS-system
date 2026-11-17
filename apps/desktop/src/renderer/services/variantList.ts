import type { ProductVariant } from "@muzammil-pos/types";
import { apiRequest } from "./http";

export async function listProductVariants(productId: string): Promise<ProductVariant[]> {
  const res = await apiRequest<{ variants: ProductVariant[] }>(`/inventory/products/${productId}/variants`);
  return res.variants;
}