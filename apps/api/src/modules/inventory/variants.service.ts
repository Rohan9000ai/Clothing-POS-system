import { prisma } from "../../database/prisma";
import { Errors } from "../../common/errors";
import { generateVariantSku } from "@muzammil-pos/utils";
import type {
  CreateProductVariantInput,
  UpdateProductVariantInput,
  ToggleProductVariantStatusInput,
} from "@muzammil-pos/validation";

/**
 * Builds the base SKU from product code + size + color, then checks for
 * collisions (e.g. two colors that both start with the same 3 letters)
 * and appends a numeric suffix until it's unique.
 */
async function generateUniqueVariantSku(
  productCode: string,
  size: string,
  color: string
): Promise<string> {
  const base = generateVariantSku(productCode, size, color);
  let candidate = base;
  let suffix = 2;

  while (await prisma.productVariant.findUnique({ where: { variantSku: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }

  return candidate;
}

async function assertNoDuplicateVariant(
  productId: string,
  size: string,
  color: string,
  excludeVariantId?: string
) {
  const existing = await prisma.productVariant.findFirst({
    where: {
      productId,
      size,
      color,
      ...(excludeVariantId ? { id: { not: excludeVariantId } } : {}),
    },
  });
  if (existing) {
    throw Errors.duplicateVariant(size, color);
  }
}

export async function listVariants(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw Errors.notFound("Product", productId);

  return prisma.productVariant.findMany({
    where: { productId },
    orderBy: [{ size: "asc" }, { color: "asc" }],
  });
}

export async function getVariantById(id: string) {
  const variant = await prisma.productVariant.findUnique({ where: { id } });
  if (!variant) throw Errors.notFound("Product variant", id);
  return variant;
}

export async function createVariant(
  productId: string,
  input: CreateProductVariantInput,
  createdById: string
) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw Errors.notFound("Product", productId);

  await assertNoDuplicateVariant(productId, input.size, input.color);

  const variantSku = await generateUniqueVariantSku(product.productCode, input.size, input.color);

  return prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.create({
      data: {
        productId,
        size: input.size,
        color: input.color,
        variantSku,
        quantity: input.quantity,
        priceOverride: input.priceOverride ?? null,
        status: "ACTIVE",
      },
    });

    // Record the starting stock as an audit trail entry, same as any other
    // quantity change — see docs/architecture/overview.md "Data safety".
    if (input.quantity > 0) {
      await tx.inventoryMovement.create({
        data: {
          variantId: variant.id,
          movementType: "ADJUSTMENT",
          quantityChange: input.quantity,
          referenceType: "VARIANT_CREATED",
          referenceId: variant.id,
          createdById,
        },
      });
    }

    return variant;
  });
}

export async function updateVariant(
  id: string,
  input: UpdateProductVariantInput,
  updatedById: string
) {
  const variant = await prisma.productVariant.findUnique({ where: { id } });
  if (!variant) throw Errors.notFound("Product variant", id);

  const nextSize = input.size ?? variant.size;
  const nextColor = input.color ?? variant.color;

  if (input.size !== undefined || input.color !== undefined) {
    await assertNoDuplicateVariant(variant.productId, nextSize, nextColor, id);
  }

  const quantityChanging = input.quantity !== undefined && input.quantity !== variant.quantity;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.productVariant.update({
      where: { id },
      data: {
        ...(input.size !== undefined ? { size: input.size } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
        ...(input.priceOverride !== undefined ? { priceOverride: input.priceOverride } : {}),
      },
    });

    // Manual quantity edits (not sales) still get logged, so stock history
    // stays complete even for corrections made from the Inventory screen.
    if (quantityChanging) {
      await tx.inventoryMovement.create({
        data: {
          variantId: id,
          movementType: "ADJUSTMENT",
          quantityChange: (input.quantity as number) - variant.quantity,
          referenceType: "MANUAL_ADJUSTMENT",
          referenceId: id,
          createdById: updatedById,
        },
      });
    }

    return updated;
  });
}

export async function toggleVariantStatus(id: string, input: ToggleProductVariantStatusInput) {
  const variant = await prisma.productVariant.findUnique({ where: { id } });
  if (!variant) throw Errors.notFound("Product variant", id);

  return prisma.productVariant.update({ where: { id }, data: { status: input.status } });
}

export async function deleteVariant(id: string) {
  const variant = await prisma.productVariant.findUnique({ where: { id } });
  if (!variant) throw Errors.notFound("Product variant", id);

  const saleItemCount = await prisma.saleItem.count({ where: { variantId: id } });
  if (saleItemCount > 0) {
    throw Errors.variantHasRelatedRecords(`${variant.size} / ${variant.color}`);
  }

  // A variant that was created but never sold can be removed cleanly,
  // including its own creation/adjustment history.
  await prisma.$transaction([
    prisma.inventoryMovement.deleteMany({ where: { variantId: id } }),
    prisma.productVariant.delete({ where: { id } }),
  ]);

  return { success: true };
}