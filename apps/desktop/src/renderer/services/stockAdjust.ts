import { apiRequest } from "./http";

/** Negative = remove pieces (damaged, lost). Positive = add pieces (customer return). */
export async function adjustVariantStock(
  productId: string,
  variantId: string,
  quantityChange: number,
  reason: string
): Promise<void> {
  await apiRequest(`/inventory/products/${productId}/variants/${variantId}/adjust`, {
    method: "POST",
    body: { quantityChange, reason },
  });
}