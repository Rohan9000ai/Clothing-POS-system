import { prisma } from "../../database/prisma";
import { percentOf } from "./report-math";

interface SupplierTotals {
  purchases: number;
  payments: number;
  adjustments: number;
  lastPayment: Date | null;
  lastPurchase: Date | null;
}

/** What the shop owes each supplier: opening balance + bills + adjustments - payments. */
export async function getPayablesReport() {
  const [suppliers, groups] = await Promise.all([
    prisma.supplier.findMany({
      select: { id: true, name: true, phone: true, status: true, openingBalance: true },
    }),
    prisma.supplierTransaction.groupBy({
      by: ["supplierId", "type"],
      _sum: { amount: true },
      _max: { date: true },
    }),
  ]);

  const totalsBySupplier = new Map<string, SupplierTotals>();
  for (const group of groups) {
    const totals = totalsBySupplier.get(group.supplierId) ?? {
      purchases: 0,
      payments: 0,
      adjustments: 0,
      lastPayment: null,
      lastPurchase: null,
    };
    const amount = group._sum.amount ?? 0;
    const lastDate = group._max.date ?? null;

    if (group.type === "PURCHASE") {
      totals.purchases += amount;
      totals.lastPurchase = lastDate;
    } else if (group.type === "PAYMENT") {
      totals.payments += amount;
      totals.lastPayment = lastDate;
    } else {
      totals.adjustments += amount;
    }
    totalsBySupplier.set(group.supplierId, totals);
  }

  const rows = suppliers.map((supplier) => {
    const totals = totalsBySupplier.get(supplier.id);
    const purchases = totals?.purchases ?? 0;
    const adjustments = totals?.adjustments ?? 0;
    const paid = totals?.payments ?? 0;
    const totalBalance = supplier.openingBalance + purchases + adjustments;
    return {
      supplierId: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      status: supplier.status,
      openingBalance: supplier.openingBalance,
      purchases,
      adjustments,
      totalBalance,
      paid,
      remaining: totalBalance - paid,
      lastPaymentDate: totals?.lastPayment ? totals.lastPayment.toISOString().slice(0, 10) : null,
      lastPurchaseDate: totals?.lastPurchase ? totals.lastPurchase.toISOString().slice(0, 10) : null,
    };
  });

  const totalOwed = rows.reduce((sum, row) => sum + Math.max(row.remaining, 0), 0);
  const totalAdvance = rows.reduce((sum, row) => sum + Math.max(-row.remaining, 0), 0);

  const supplierRows = rows
    .map((row) => ({
      ...row,
      sharePercent: row.remaining > 0 ? percentOf(row.remaining, totalOwed) : 0,
    }))
    .sort((a, b) => b.remaining - a.remaining || a.name.localeCompare(b.name));

  return {
    summary: {
      supplierCount: rows.length,
      owedSupplierCount: rows.filter((row) => row.remaining > 0).length,
      settledSupplierCount: rows.filter((row) => row.remaining === 0).length,
      advanceSupplierCount: rows.filter((row) => row.remaining < 0).length,
      totalOwed,
      totalAdvance,
      /** Owed minus advances: the real net position with suppliers. */
      netPayable: totalOwed - totalAdvance,
      totalOpening: rows.reduce((sum, row) => sum + row.openingBalance, 0),
      totalPurchased: rows.reduce((sum, row) => sum + row.purchases, 0),
      totalPaid: rows.reduce((sum, row) => sum + row.paid, 0),
    },
    suppliers: supplierRows,
    generatedAt: new Date().toISOString(),
  };
}