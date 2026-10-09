import type { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { Errors } from "../../common/errors";
import { recordAuditLog } from "../../common/audit-log";
import { generateVariantSku } from "@muzammil-pos/utils";
import type { CreateSupplierPurchaseInput, VoidSupplierPurchaseInput } from "@muzammil-pos/validation";

const PURCHASE_INCLUDE = {
  items: true,
  createdBy: { select: { id: true, fullName: true, username: true } },
} as const;

/** "XL ", "xl" and "XL" all mean the same size. */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

async function uniqueVariantSku(
  tx: Prisma.TransactionClient,
  productCode: string,
  size: string,
  color: string
): Promise<string> {
  const base = generateVariantSku(productCode, size, color);
  let candidate = base;
  let suffix = 2;
  while (await tx.productVariant.findUnique({ where: { variantSku: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  return candidate;
}

export async function listSupplierPurchases(supplierId: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw Errors.notFound("Supplier", supplierId);

  return prisma.supplierPurchase.findMany({
    where: { supplierId },
    include: PURCHASE_INCLUDE,
    orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function createSupplierPurchase(
  supplierId: string,
  input: CreateSupplierPurchaseInput,
  createdById: string
) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw Errors.notFound("Supplier", supplierId);
  if (supplier.status !== "ACTIVE") throw Errors.inactiveSupplier(supplier.name);

  // The same product / size / color twice on one bill is almost certainly a mistake.
  const seen = new Set<string>();
  for (const item of input.items) {
    const key = `${item.productId}|${normalize(item.size)}|${normalize(item.color)}`;
    if (seen.has(key)) {
      throw Errors.validation(
        `Size "${item.size}" in color "${item.color}" appears more than once for the same product. Combine those lines into one.`,
        { field: "items" }
      );
    }
    seen.add(key);
  }

  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productById = new Map(products.map((p) => [p.id, p]));
  for (const productId of productIds) {
    const product = productById.get(productId);
    if (!product) throw Errors.notFound("Product", productId);
    if (product.status !== "ACTIVE") throw Errors.productInactiveForPurchase(product.name);
  }

  const totalAmount = input.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  const billNo = input.billNo?.trim() || null;
  const notes = input.notes?.trim() || null;
  const purchaseDate = new Date(input.purchaseDate);

  // The bill, the supplier's balance and the stock are saved together or not at all.
  return prisma.$transaction(
    async (tx) => {
      // Raises what we owe this supplier. Purchases have no payment method;
      // CASH is only a placeholder for the required column and is never shown.
      const ledgerEntry = await tx.supplierTransaction.create({
        data: {
          supplierId,
          type: "PURCHASE",
          amount: totalAmount,
          paymentMethod: "CASH",
          referenceNo: billNo,
          notes: billNo ? `Purchase bill ${billNo}` : "Stock purchase",
          date: purchaseDate,
          createdById,
        },
      });

      const purchase = await tx.supplierPurchase.create({
        data: {
          supplierId,
          billNo,
          purchaseDate,
          totalAmount,
          notes,
          status: "ACTIVE",
          supplierTransactionId: ledgerEntry.id,
          createdById,
        },
      });

      let createdVariants = 0;

      for (const item of input.items) {
        const product = productById.get(item.productId);
        if (!product) throw Errors.notFound("Product", item.productId);

        const siblings = await tx.productVariant.findMany({ where: { productId: product.id } });
        const existing = siblings.find(
          (v) => normalize(v.size) === normalize(item.size) && normalize(v.color) === normalize(item.color)
        );

        let target: { id: string; size: string; color: string };

        if (existing) {
          if (existing.status !== "ACTIVE") {
            throw Errors.variantInactiveForPurchase(`${product.name} — ${existing.size} / ${existing.color}`);
          }
          target = await tx.productVariant.update({
            where: { id: existing.id },
            data: { quantity: { increment: item.quantity } },
          });
        } else {
          const size = item.size.trim();
          const color = item.color.trim();
          target = await tx.productVariant.create({
            data: {
              productId: product.id,
              size,
              color,
              variantSku: await uniqueVariantSku(tx, product.productCode, size, color),
              quantity: item.quantity,
              status: "ACTIVE",
            },
          });
          createdVariants++;
        }

        await tx.supplierPurchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: product.id,
            variantId: target.id,
            productNameSnapshot: product.name,
            sizeSnapshot: target.size,
            colorSnapshot: target.color,
            quantity: item.quantity,
            unitCost: item.unitCost,
            lineTotal: item.quantity * item.unitCost,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            variantId: target.id,
            movementType: "PURCHASE",
            quantityChange: item.quantity,
            referenceType: "SUPPLIER_PURCHASE",
            referenceId: purchase.id,
            createdById,
          },
        });
      }

      await recordAuditLog(tx, {
        userId: createdById,
        action: "SUPPLIER_TRANSACTION_CREATED",
        entity: "SupplierTransaction",
        entityId: ledgerEntry.id,
        newData: { supplierId, type: "PURCHASE", amount: totalAmount, viaPurchase: true },
      });
      await recordAuditLog(tx, {
        userId: createdById,
        action: "SUPPLIER_PURCHASE_CREATED",
        entity: "SupplierPurchase",
        entityId: purchase.id,
        newData: { supplierId, billNo, totalAmount, lineCount: input.items.length, createdVariants },
      });

      return tx.supplierPurchase.findUniqueOrThrow({ where: { id: purchase.id }, include: PURCHASE_INCLUDE });
    },
    { timeout: 30000 }
  );
}

export async function voidSupplierPurchase(
  supplierId: string,
  purchaseId: string,
  input: VoidSupplierPurchaseInput,
  voidedById: string
) {
  const purchase = await prisma.supplierPurchase.findUnique({
    where: { id: purchaseId },
    include: { items: true },
  });
  if (!purchase || purchase.supplierId !== supplierId) throw Errors.notFound("Supplier bill", purchaseId);
  if (purchase.status === "VOID") throw Errors.purchaseAlreadyVoided();

  // Voiding takes this stock back out, so it must still be on the shelf.
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: purchase.items.map((i) => i.variantId) } },
  });
  const variantById = new Map(variants.map((v) => [v.id, v]));

  const shortfalls = purchase.items
    .filter((item) => (variantById.get(item.variantId)?.quantity ?? 0) < item.quantity)
    .map((item) => ({
      label: `${item.productNameSnapshot} — ${item.sizeSnapshot} / ${item.colorSnapshot}`,
      bought: item.quantity,
      inStock: variantById.get(item.variantId)?.quantity ?? 0,
    }));
  if (shortfalls.length > 0) throw Errors.purchaseStockAlreadyUsed(shortfalls);

  return prisma.$transaction(
    async (tx) => {
      for (const item of purchase.items) {
        // Conditional decrement, so a sale happening right now can't push stock below zero.
        const removed = await tx.productVariant.updateMany({
          where: { id: item.variantId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        });
        if (removed.count === 0) {
          const current = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          throw Errors.purchaseStockAlreadyUsed([
            {
              label: `${item.productNameSnapshot} — ${item.sizeSnapshot} / ${item.colorSnapshot}`,
              bought: item.quantity,
              inStock: current?.quantity ?? 0,
            },
          ]);
        }

        await tx.inventoryMovement.create({
          data: {
            variantId: item.variantId,
            movementType: "VOID",
            quantityChange: -item.quantity,
            referenceType: "SUPPLIER_PURCHASE_VOID",
            referenceId: purchase.id,
            createdById: voidedById,
          },
        });
      }

      const voidedNote = `[VOIDED] ${input.reason}`;
      const updated = await tx.supplierPurchase.update({
        where: { id: purchase.id },
        data: {
          status: "VOID",
          notes: purchase.notes ? `${purchase.notes}\n${voidedNote}` : voidedNote,
          supplierTransactionId: null,
        },
        include: PURCHASE_INCLUDE,
      });

      // Takes the bill off the supplier's account, so what is owed goes back down.
      if (purchase.supplierTransactionId) {
        await tx.supplierTransaction.deleteMany({ where: { id: purchase.supplierTransactionId } });
        await recordAuditLog(tx, {
          userId: voidedById,
          action: "SUPPLIER_TRANSACTION_DELETED",
          entity: "SupplierTransaction",
          entityId: purchase.supplierTransactionId,
          oldData: { supplierId, type: "PURCHASE", amount: purchase.totalAmount, viaPurchase: true },
        });
      }

      await recordAuditLog(tx, {
        userId: voidedById,
        action: "SUPPLIER_PURCHASE_VOIDED",
        entity: "SupplierPurchase",
        entityId: purchase.id,
        oldData: { status: "ACTIVE" },
        newData: { status: "VOID", reason: input.reason, billNo: purchase.billNo },
      });

      return updated;
    },
    { timeout: 30000 }
  );
}