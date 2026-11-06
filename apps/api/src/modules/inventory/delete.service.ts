import * as fs from "fs";
import * as path from "path";
import { prisma } from "../../database/prisma";
import { env } from "../../common/env";
import { Errors } from "../../common/errors";
import { recordAuditLog } from "../../common/audit-log";
import { applyCostFreeze, planCostFreeze } from "./freeze-costs";

/** Removes picture files after the database delete succeeded. A leftover file is harmless. */
function removeFiles(images: object[]) {
  for (const image of images) {
    const url = Object.values(image).find((v): v is string => typeof v === "string" && v.startsWith("/uploads/"));
    if (!url) continue;
    try {
      fs.rmSync(path.join(env.uploadsRootDir, url.replace(/^\/uploads\//, "")), { force: true });
    } catch {
      // ignore
    }
  }
}

export async function deleteProductForever(productId: string, actorId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: { select: { id: true } }, images: true },
  });
  if (!product) throw Errors.notFound("Product", productId);

  const freezes = await planCostFreeze({ productId });

  await prisma.$transaction(
    async (tx) => {
      // Save what each sold piece cost, so profit reports stay right after the delete.
      await applyCostFreeze(tx, productId, freezes);
      // Sizes, pictures and stock history go with it; old bills keep their saved text.
      await tx.product.delete({ where: { id: productId } });
      await recordAuditLog(tx, {
        userId: actorId,
        action: "PRODUCT_DELETED",
        entity: "Product",
        entityId: productId,
        oldData: { name: product.name, productCode: product.productCode, sizes: product.variants.length },
      });
    },
    { timeout: 30000 }
  );

  removeFiles(product.images);
}

export async function deleteVariantForever(productId: string, variantId: string, actorId: string) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { name: true, productCode: true } } },
  });
  if (!variant || variant.productId !== productId) throw Errors.notFound("Size / color", variantId);

  const freezes = await planCostFreeze({ productId, variantId });

  await prisma.$transaction(
    async (tx) => {
      await applyCostFreeze(tx, productId, freezes);
      await tx.productVariant.delete({ where: { id: variantId } });
      await recordAuditLog(tx, {
        userId: actorId,
        action: "VARIANT_DELETED",
        entity: "ProductVariant",
        entityId: variantId,
        oldData: {
          product: variant.product.name,
          productCode: variant.product.productCode,
          size: variant.size,
          color: variant.color,
          stock: variant.quantity,
        },
      });
    },
    { timeout: 30000 }
  );
}