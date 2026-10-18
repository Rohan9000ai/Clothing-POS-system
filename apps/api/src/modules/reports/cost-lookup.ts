import { prisma } from "../../database/prisma";

export type CostSource = "PRODUCT_COST_PRICE" | "SUPPLIER_BILL";

export interface CostLookup {
  /** Cost per piece in paisa and where it came from, or null when no cost is known. */
  unitCost(productId: string, variantId: string): { value: number; source: CostSource } | null;
}

/**
 * The same rule the profit report uses for cost of goods:
 * 1. the product's own cost price (0 means "not entered")
 * 2. the newest active supplier bill for that exact size and color
 * 3. the newest active supplier bill for the product
 * 4. otherwise unknown (null)
 */
export async function loadCostLookup(productIds: string[]): Promise<CostLookup> {
  const [products, billItems] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, costPrice: true },
    }),
    prisma.supplierPurchaseItem.findMany({
      where: { productId: { in: productIds }, purchase: { status: "ACTIVE" } },
      select: {
        productId: true,
        variantId: true,
        unitCost: true,
        purchase: { select: { purchaseDate: true, createdAt: true } },
      },
    }),
  ]);

  const costPriceByProduct = new Map<string, number>();
  for (const product of products) {
    if (product.costPrice !== null && product.costPrice > 0) costPriceByProduct.set(product.id, product.costPrice);
  }

  // Newest bill first, so the first price seen for a size/color or a product is the latest.
  billItems.sort(
    (a, b) =>
      b.purchase.purchaseDate.getTime() - a.purchase.purchaseDate.getTime() ||
      b.purchase.createdAt.getTime() - a.purchase.createdAt.getTime()
  );
  const billCostByVariant = new Map<string, number>();
  const billCostByProduct = new Map<string, number>();
  for (const item of billItems) {
    if (!billCostByVariant.has(item.variantId)) billCostByVariant.set(item.variantId, item.unitCost);
    if (!billCostByProduct.has(item.productId)) billCostByProduct.set(item.productId, item.unitCost);
  }

  return {
    unitCost(productId, variantId) {
      const own = costPriceByProduct.get(productId);
      if (own !== undefined) return { value: own, source: "PRODUCT_COST_PRICE" };
      const fromBill = billCostByVariant.get(variantId) ?? billCostByProduct.get(productId);
      return fromBill !== undefined ? { value: fromBill, source: "SUPPLIER_BILL" } : null;
    },
  };
}