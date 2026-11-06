import type { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { loadCostLookup } from "../reports/cost-lookup";

export interface CostFreeze {
  /** null = bill lines whose size was already deleted earlier. */
  variantId: string | null;
  /** What one piece cost, in paisa. */
  unitCost: number;
}

/**
 * Before a product or size is deleted: work out what its already-sold pieces cost,
 * so the profit reports stay right afterwards. Call this BEFORE the delete transaction opens.
 */
export async function planCostFreeze(scope: { productId: string; variantId?: string }): Promise<CostFreeze[]> {
  const where: Prisma.SaleItemWhereInput = { productId: scope.productId, unitCostSnapshot: null };
  if (scope.variantId) where.variantId = scope.variantId;

  const rows = await prisma.saleItem.findMany({
    where,
    select: { variantId: true },
    distinct: ["variantId"],
  });
  if (rows.length === 0) return [];

  const lookup = await loadCostLookup([scope.productId]);

  const freezes: CostFreeze[] = [];
  for (const row of rows) {
    // A line whose size is already gone falls back to the product-level cost.
    const cost = lookup.unitCost(scope.productId, row.variantId ?? "");
    if (cost) freezes.push({ variantId: row.variantId, unitCost: cost.value });
  }
  return freezes;
}

/** Saves the planned costs onto the bill lines. Run it inside the delete transaction, right before the delete. */
export async function applyCostFreeze(
  tx: Prisma.TransactionClient,
  productId: string,
  freezes: CostFreeze[]
): Promise<void> {
  for (const freeze of freezes) {
    await tx.saleItem.updateMany({
      where: { productId, variantId: freeze.variantId, unitCostSnapshot: null },
      data: { unitCostSnapshot: freeze.unitCost },
    });
  }
}