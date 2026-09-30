import { prisma } from "../../database/prisma";
import { Errors } from "../../common/errors";
import { getSettings } from "../settings/settings.service";
import type { AdjustStockInput } from "@muzammil-pos/validation";

export async function adjustStock(variantId: string, input: AdjustStockInput, createdById: string) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });
  if (!variant) throw Errors.notFound("Product variant", variantId);

  const nextQuantity = variant.quantity + input.quantityChange;
  if (nextQuantity < 0) {
    throw Errors.adjustmentWouldGoNegative(
      `${variant.product.name} — ${variant.size} / ${variant.color}`,
      variant.quantity,
      input.quantityChange
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.productVariant.update({
      where: { id: variantId },
      data: { quantity: nextQuantity },
    });

    await tx.inventoryMovement.create({
      data: {
        variantId,
        movementType: "ADJUSTMENT",
        quantityChange: input.quantityChange,
        referenceType: "STOCK_ADJUSTMENT",
        referenceId: variantId,
        createdById,
      },
    });

    return updated;
  });
}

export async function listVariantMovements(variantId: string) {
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw Errors.notFound("Product variant", variantId);

  return prisma.inventoryMovement.findMany({
    where: { variantId },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, fullName: true, username: true } },
    },
  });
}

export interface LowStockRow {
  variantId: string;
  productId: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
}

/**
 * Products/variants below the shop's configured threshold (settings.lowStockThreshold,
 * default 5). Only ACTIVE products and ACTIVE variants are considered — an
 * inactive/retired item running low isn't something the shop needs an alert for.
 */
export async function listLowStock(): Promise<LowStockRow[]> {
  const settings = await getSettings();

  const variants = await prisma.productVariant.findMany({
    where: {
      status: "ACTIVE",
      quantity: { lt: settings.lowStockThreshold },
      product: { status: "ACTIVE" },
    },
    include: { product: { select: { id: true, name: true } } },
    orderBy: { quantity: "asc" },
  });

  return variants.map((v) => ({
    variantId: v.id,
    productId: v.product.id,
    productName: v.product.name,
    size: v.size,
    color: v.color,
    quantity: v.quantity,
  }));
}

/**
 * Lightweight product listing shaped for the Cashier POS screen: only
 * ACTIVE products with their ACTIVE variants, minimal fields, capped result
 * count. Kept as a separate query from the admin Inventory list (which
 * needs full pagination, all statuses, and heavier includes like images/category)
 * per the performance requirement to cache/optimize the cashier's product search.
 */
export async function listActiveProductsForCashier(search?: string) {
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      ...(search
        ? { OR: [{ name: { contains: search } }, { productCode: { contains: search } }] }
        : {}),
    },
    select: {
      id: true,
      productCode: true,
      name: true,
      basePrice: true,
      primaryImageUrl: true,
      category: { select: { id: true, name: true } },
      variants: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          size: true,
          color: true,
          variantSku: true,
          quantity: true,
          priceOverride: true,
        },
      },
    },
    orderBy: { name: "asc" },
    take: 100,
  });

  // A product with zero active variants can't be sold — hide it from the
  // cashier's search entirely rather than showing an unpickable item.
  return products.filter((p) => p.variants.length > 0);
}