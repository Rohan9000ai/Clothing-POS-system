import { prisma } from "../../database/prisma";
import { Errors } from "../../common/errors";
import { recordAuditLog } from "../../common/audit-log";
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  ToggleSupplierStatusInput,
  CreateSupplierTransactionInput,
} from "@muzammil-pos/validation";

export interface SupplierBalance {
  openingBalance: number;
  totalPurchases: number;
  totalPayments: number;
  totalAdjustments: number;
  /** What the shop owes this supplier before payments: opening + purchases + adjustments. */
  totalBalance: number;
  /** Total paid to this supplier so far. */
  givenBalance: number;
  /** totalBalance - givenBalance. Positive = still owed; negative = overpaid. */
  remainingBalance: number;
}

async function computeBalance(supplierId: string, openingBalance: number): Promise<SupplierBalance> {
  const transactions = await prisma.supplierTransaction.findMany({ where: { supplierId } });

  let totalPurchases = 0;
  let totalPayments = 0;
  let totalAdjustments = 0;

  for (const txn of transactions) {
    if (txn.type === "PURCHASE") totalPurchases += txn.amount;
    else if (txn.type === "PAYMENT") totalPayments += txn.amount;
    else totalAdjustments += txn.amount; // signed, can be negative
  }

  const totalBalance = openingBalance + totalPurchases + totalAdjustments;
  const givenBalance = totalPayments;
  const remainingBalance = totalBalance - givenBalance;

  return { openingBalance, totalPurchases, totalPayments, totalAdjustments, totalBalance, givenBalance, remainingBalance };
}

export async function listSuppliers() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });

  return Promise.all(
    suppliers.map(async (s) => ({
      ...s,
      balance: await computeBalance(s.id, s.openingBalance),
    }))
  );
}

export async function getSupplierById(id: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) throw Errors.notFound("Supplier", id);

  const [balance, transactions] = await Promise.all([
    computeBalance(id, supplier.openingBalance),
    prisma.supplierTransaction.findMany({
      where: { supplierId: id },
      orderBy: { date: "desc" },
      include: { createdBy: { select: { id: true, fullName: true, username: true } } },
    }),
  ]);

  return { ...supplier, balance, transactions };
}

export async function createSupplier(input: CreateSupplierInput) {
  return prisma.supplier.create({
    data: {
      name: input.name,
      phone: input.phone,
      address: input.address,
      openingBalance: input.openingBalance,
      status: "ACTIVE",
    },
  });
}

export async function updateSupplier(id: string, input: UpdateSupplierInput) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) throw Errors.notFound("Supplier", id);

  return prisma.supplier.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
    },
  });
}

export async function toggleSupplierStatus(id: string, input: ToggleSupplierStatusInput) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) throw Errors.notFound("Supplier", id);
  return prisma.supplier.update({ where: { id }, data: { status: input.status } });
}

export async function deleteSupplier(id: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) throw Errors.notFound("Supplier", id);

  const [transactionCount, purchaseCount, expenseCount] = await Promise.all([
    prisma.supplierTransaction.count({ where: { supplierId: id } }),
    prisma.supplierPurchase.count({ where: { supplierId: id } }),
    prisma.expense.count({ where: { supplierId: id } }),
  ]);
  if (transactionCount + purchaseCount + expenseCount > 0) {
    throw Errors.supplierHasTransactions(supplier.name);
  }

  await prisma.supplier.delete({ where: { id } });
  return { success: true };
}

export async function createSupplierTransaction(
  supplierId: string,
  input: CreateSupplierTransactionInput,
  createdById: string
) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw Errors.notFound("Supplier", supplierId);
  if (supplier.status !== "ACTIVE") throw Errors.inactiveSupplier(supplier.name);

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.supplierTransaction.create({
      data: {
        supplierId,
        type: input.type,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        referenceNo: input.referenceNo ?? null,
        notes: input.notes ?? null,
        date: new Date(input.date),
        createdById,
      },
    });

    await recordAuditLog(tx, {
      userId: createdById,
      action: "SUPPLIER_TRANSACTION_CREATED",
      entity: "SupplierTransaction",
      entityId: transaction.id,
      newData: { supplierId, type: input.type, amount: input.amount },
    });

    return transaction;
  });
}

export async function listSupplierTransactions(supplierId: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw Errors.notFound("Supplier", supplierId);

  return prisma.supplierTransaction.findMany({
    where: { supplierId },
    orderBy: { date: "desc" },
    include: { createdBy: { select: { id: true, fullName: true, username: true } } },
  });
}