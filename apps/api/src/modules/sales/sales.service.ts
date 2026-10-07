import { prisma } from "../../database/prisma";
import { Errors } from "../../common/errors";
import { recordAuditLog } from "../../common/audit-log";
import { generateBillNo } from "@muzammil-pos/utils";
import { getOrCreateWalkInCustomer, getCustomerById } from "../customers/customers.service";
import type { CreateSaleInput, VoidSaleInput } from "@muzammil-pos/validation";
import type { PaginationQuery } from "@muzammil-pos/types";

const SALE_INCLUDE = {
  items: true,
  payments: true,
  customer: true,
  salesman: true,
  cashier: { select: { id: true, fullName: true, username: true } },
} as const;

async function generateUniqueBillNo(): Promise<string> {
  const year = new Date().getFullYear();
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const count = await prisma.sale.count({ where: { saleDate: { gte: startOfYear } } });

  let attempt = count + 1;
  for (let i = 0; i < 20; i++) {
    const billNo = generateBillNo(attempt);
    const existing = await prisma.sale.findUnique({ where: { billNo } });
    if (!existing) return billNo;
    attempt++;
  }
  return `MS-${year}-${Date.now()}`;
}

interface PreparedItem {
  productId: string;
  variantId: string;
  productName: string;
  size: string;
  color: string;
  unitPrice: number;
  quantity: number;
  lineDiscount: number;
  lineTotal: number;
}

export async function createSale(input: CreateSaleInput, cashierId: string) {
  const customer = input.customerId
    ? await getCustomerById(input.customerId)
    : await getOrCreateWalkInCustomer();
  if (!customer) {
    throw Errors.notFound("Customer", input.customerId ?? "");
  }
  if (customer.status !== "ACTIVE") {
    throw Errors.validation(`Customer "${customer.name}" is inactive.`, { field: "customerId" });
  }

  if (input.salesmanId) {
    const salesman = await prisma.salesman.findUnique({ where: { id: input.salesmanId } });
    if (!salesman) throw Errors.notFound("Salesman", input.salesmanId);
    if (salesman.status !== "ACTIVE") throw Errors.inactiveSalesman(salesman.name);
  }

  let subTotal = 0;
  let itemDiscountTotal = 0;
  const preparedItems: PreparedItem[] = [];

  for (const item of input.items) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: item.variantId },
      include: { product: true },
    });
    if (!variant || variant.productId !== item.productId) {
      throw Errors.notFound("Product variant", item.variantId);
    }
    if (variant.product.status !== "ACTIVE") {
      throw Errors.productNotSellable(variant.product.name);
    }
    if (variant.status !== "ACTIVE") {
      throw Errors.variantNotSellable(`${variant.product.name} — ${variant.size} / ${variant.color}`);
    }
    if (variant.quantity < item.quantity) {
      throw Errors.insufficientStock(variant.id, item.quantity, variant.quantity);
    }

    const unitPrice = variant.priceOverride ?? variant.product.basePrice;
    const grossLine = unitPrice * item.quantity;
    if (item.lineDiscount > grossLine) {
      throw Errors.validation(`Discount for "${variant.product.name}" cannot exceed the line total.`, {
        field: "items",
      });
    }

    subTotal += grossLine;
    itemDiscountTotal += item.lineDiscount;

    preparedItems.push({
      productId: variant.productId,
      variantId: variant.id,
      productName: variant.product.name,
      size: variant.size,
      color: variant.color,
      unitPrice,
      quantity: item.quantity,
      lineDiscount: item.lineDiscount,
      lineTotal: grossLine - item.lineDiscount,
    });
  }

  const discountTotal = itemDiscountTotal + input.discountTotal;
  const netTotal = subTotal - discountTotal;
  if (netTotal < 0) {
    throw Errors.validation("Total discount cannot exceed the subtotal.", { field: "discountTotal" });
  }

  const totalPaid = input.payments.reduce((sum, p) => sum + p.amount, 0);
  if (totalPaid > netTotal) {
    throw Errors.paymentExceedsNetTotal(totalPaid, netTotal);
  }
  const paymentStatus = totalPaid === netTotal ? "PAID" : totalPaid > 0 ? "PARTIAL" : "UNPAID";

  const billNo = await generateUniqueBillNo();

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        billNo,
        saleDate: new Date(),
        cashierId,
        salesmanId: input.salesmanId ?? null,
        customerId: customer.id,
        subTotal,
        discountTotal,
        netTotal,
        paymentStatus,
        saleStatus: "COMPLETED",
        notes: input.notes ?? null,
      },
    });

    for (const item of preparedItems) {
      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: item.productId,
          variantId: item.variantId,
          productNameSnapshot: item.productName,
          sizeSnapshot: item.size,
          colorSnapshot: item.color,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineDiscount: item.lineDiscount,
          lineTotal: item.lineTotal,
        },
      });

      const decremented = await tx.productVariant.updateMany({
        where: { id: item.variantId, quantity: { gte: item.quantity } },
        data: { quantity: { decrement: item.quantity } },
      });
      if (decremented.count === 0) {
        const current = await tx.productVariant.findUnique({ where: { id: item.variantId } });
        throw Errors.insufficientStock(item.variantId, item.quantity, current?.quantity ?? 0);
      }

      await tx.inventoryMovement.create({
        data: {
          variantId: item.variantId,
          movementType: "SALE",
          quantityChange: -item.quantity,
          referenceType: "SALE",
          referenceId: sale.id,
          createdById: cashierId,
        },
      });
    }

    for (const payment of input.payments) {
      await tx.salePayment.create({
        data: {
          saleId: sale.id,
          method: payment.method,
          amount: payment.amount,
          referenceNo: payment.referenceNo ?? null,
        },
      });
    }

    await recordAuditLog(tx, {
      userId: cashierId,
      action: "SALE_CREATED",
      entity: "Sale",
      entityId: sale.id,
      newData: { billNo: sale.billNo, netTotal, paymentStatus, itemCount: preparedItems.length },
    });

    return tx.sale.findUniqueOrThrow({ where: { id: sale.id }, include: SALE_INCLUDE });
  });
}

export async function getSaleById(id: string) {
  const sale = await prisma.sale.findUnique({ where: { id }, include: SALE_INCLUDE });
  if (!sale) throw Errors.notFound("Sale", id);
  return sale;
}

export async function voidSale(id: string, input: VoidSaleInput, voidedById: string) {
  const sale = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
  if (!sale) throw Errors.notFound("Sale", id);
  if (sale.saleStatus === "VOID") throw Errors.saleAlreadyVoided(sale.billNo);

  return prisma.$transaction(async (tx) => {
    for (const item of sale.items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { quantity: { increment: item.quantity } },
      });

      await tx.inventoryMovement.create({
        data: {
          variantId: item.variantId,
          movementType: "VOID",
          quantityChange: item.quantity,
          referenceType: "SALE_VOID",
          referenceId: sale.id,
          createdById: voidedById,
        },
      });
    }

    const voidedNote = `[VOIDED] ${input.reason}`;
    const updated = await tx.sale.update({
      where: { id },
      data: {
        saleStatus: "VOID",
        notes: sale.notes ? `${sale.notes}\n${voidedNote}` : voidedNote,
      },
      include: SALE_INCLUDE,
    });

    await recordAuditLog(tx, {
      userId: voidedById,
      action: "SALE_VOIDED",
      entity: "Sale",
      entityId: sale.id,
      oldData: { saleStatus: "COMPLETED" },
      newData: { saleStatus: "VOID", reason: input.reason, billNo: sale.billNo },
    });

    return updated;
  });
}

interface ListSalesQuery extends PaginationQuery {
  status?: string;
  paymentStatus?: string;
  cashierId?: string;
  salesmanId?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function listSales(query: ListSalesQuery) {
  const page = query.page && !Number.isNaN(query.page) ? query.page : 1;
  const pageSize = query.pageSize && !Number.isNaN(query.pageSize) ? query.pageSize : 20;

  const saleDateFilter: { gte?: Date; lte?: Date } = {};
  if (query.dateFrom) saleDateFilter.gte = new Date(query.dateFrom);
  if (query.dateTo) saleDateFilter.lte = new Date(query.dateTo);

  const where = {
    ...(query.search ? { billNo: { contains: query.search } } : {}),
    ...(query.status ? { saleStatus: query.status } : {}),
    ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
    ...(query.cashierId ? { cashierId: query.cashierId } : {}),
    ...(query.salesmanId ? { salesmanId: query.salesmanId } : {}),
    ...(query.paymentMethod ? { payments: { some: { method: query.paymentMethod } } } : {}),
    ...(Object.keys(saleDateFilter).length > 0 ? { saleDate: saleDateFilter } : {}),
  };

  const [items, totalItems] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: SALE_INCLUDE,
      orderBy: { saleDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    items,
    meta: { page, pageSize, totalItems, totalPages: Math.max(Math.ceil(totalItems / pageSize), 1) },
  };
}