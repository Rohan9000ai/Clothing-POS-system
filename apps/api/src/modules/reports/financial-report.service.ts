import type { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { EXPENSE_TYPES } from "@muzammil-pos/types";
import type { FinancialReportQuery } from "@muzammil-pos/validation";
import {
  listDays,
  previousRange,
  resolveReportRange,
  toYmd,
  utcBounds,
  utcYmd,
  type ReportRange,
} from "./report-range";
import { addTo, changePercent, marginPercent, percentOf, type Bucket } from "./report-math";
import { groupOf } from "./expense-groups";

type CostSource = "PRODUCT_COST_PRICE" | "SUPPLIER_BILL" | "UNKNOWN";
const COST_SOURCES: CostSource[] = ["PRODUCT_COST_PRICE", "SUPPLIER_BILL", "UNKNOWN"];

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function addToMap(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

/** Works out everything for ONE period. Called for the chosen period and for the one before it. */
async function computeCore(range: ReportRange, topN: number) {
  const saleWhere: Prisma.SaleWhereInput = {
    saleStatus: "COMPLETED",
    saleDate: { gte: range.start, lt: range.endExclusive },
  };
  const utc = utcBounds(range);
  const expenseDates = { gte: utc.start, lt: utc.endExclusive };

  const [sales, items, expenses, collectedAgg, voidedSales, voidedExpenses] = await Promise.all([
    prisma.sale.findMany({ where: saleWhere, select: { saleDate: true, netTotal: true } }),
    prisma.saleItem.findMany({
      where: { sale: saleWhere },
      select: {
        productId: true,
        variantId: true,
        quantity: true,
        lineTotal: true,
        sale: { select: { saleDate: true } },
      },
    }),
    prisma.expense.findMany({
      where: { status: "ACTIVE", expenseDate: expenseDates },
      select: { expenseDate: true, type: true, amount: true },
    }),
    prisma.salePayment.aggregate({ where: { sale: saleWhere }, _sum: { amount: true } }),
    prisma.sale.aggregate({
      where: { saleStatus: "VOID", saleDate: { gte: range.start, lt: range.endExclusive } },
      _count: { _all: true },
      _sum: { netTotal: true },
    }),
    prisma.expense.aggregate({
      where: { status: "VOID", expenseDate: expenseDates },
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  // ---- What each piece cost ----
  const productIds = [...new Set(items.map((item) => item.productId))];
  const [products, billItems] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, costPrice: true },
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

  const nameByProduct = new Map<string, string>();
  const costPriceByProduct = new Map<string, number>();
  for (const product of products) {
    nameByProduct.set(product.id, product.name);
    // A cost price of 0 means "not entered".
    if (product.costPrice !== null && product.costPrice > 0) {
      costPriceByProduct.set(product.id, product.costPrice);
    }
  }

  // Newest bill first, so the first price seen for a size/color or a product is the latest.
  billItems.sort(
    (a, b) =>
      b.purchase.purchaseDate.getTime() - a.purchase.purchaseDate.getTime() ||
      b.purchase.createdAt.getTime() - a.purchase.createdAt.getTime()
  );
  const billCostByVariant = new Map<string, number>();
  const billCostByProduct = new Map<string, number>();
  for (const bill of billItems) {
    if (!billCostByVariant.has(bill.variantId)) billCostByVariant.set(bill.variantId, bill.unitCost);
    if (!billCostByProduct.has(bill.productId)) billCostByProduct.set(bill.productId, bill.unitCost);
  }

  // ---- Sales side ----
  let netSales = 0;
  const daySales = new Map<string, number>();
  for (const sale of sales) {
    netSales += sale.netTotal;
    addToMap(daySales, toYmd(sale.saleDate), sale.netTotal);
  }

  // ---- Cost of goods sold ----
  let cogs = 0;
  const dayCogs = new Map<string, number>();
  const costBySource: Record<CostSource, { quantity: number; revenue: number }> = {
    PRODUCT_COST_PRICE: { quantity: 0, revenue: 0 },
    SUPPLIER_BILL: { quantity: 0, revenue: 0 },
    UNKNOWN: { quantity: 0, revenue: 0 },
  };
  const gapByProduct = new Map<string, { quantity: number; revenue: number }>();

  for (const item of items) {
    const fromProduct = costPriceByProduct.get(item.productId);
    const fromBill = billCostByVariant.get(item.variantId) ?? billCostByProduct.get(item.productId);
    const unitCost = fromProduct ?? fromBill;

    if (unitCost === undefined) {
      costBySource.UNKNOWN.quantity += item.quantity;
      costBySource.UNKNOWN.revenue += item.lineTotal;
      const gap = gapByProduct.get(item.productId) ?? { quantity: 0, revenue: 0 };
      gap.quantity += item.quantity;
      gap.revenue += item.lineTotal;
      gapByProduct.set(item.productId, gap);
      continue;
    }

    const source: CostSource = fromProduct !== undefined ? "PRODUCT_COST_PRICE" : "SUPPLIER_BILL";
    const cost = item.quantity * unitCost;
    cogs += cost;
    costBySource[source].quantity += item.quantity;
    costBySource[source].revenue += item.lineTotal;
    addToMap(dayCogs, toYmd(item.sale.saleDate), cost);
  }

  const knownCostRevenue = costBySource.PRODUCT_COST_PRICE.revenue + costBySource.SUPPLIER_BILL.revenue;
  const unknownCostRevenue = costBySource.UNKNOWN.revenue;
  const itemRevenue = knownCostRevenue + unknownCostRevenue;

  const gaps = [...gapByProduct.entries()]
    .map(([productId, gap]) => ({
      productId,
      name: nameByProduct.get(productId) ?? "Deleted product",
      quantity: gap.quantity,
      revenue: gap.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topN);

  // ---- Expenses ----
  let operating = 0;
  let taxesAndOther = 0;
  let supplierPayments = 0;
  let allExpenses = 0;
  const typeBuckets = new Map<string, Bucket>();
  const dayExpenses = new Map<string, number>();
  const daySupplierPayments = new Map<string, number>();

  for (const expense of expenses) {
    allExpenses += expense.amount;
    addTo(typeBuckets, expense.type, expense.amount);

    const day = utcYmd(expense.expenseDate);
    const group = groupOf(expense.type);
    if (group === "SUPPLIER_PAYMENT") {
      supplierPayments += expense.amount;
      addToMap(daySupplierPayments, day, expense.amount);
    } else {
      if (group === "OPERATING") operating += expense.amount;
      else taxesAndOther += expense.amount;
      addToMap(dayExpenses, day, expense.amount);
    }
  }

  const profitLossExpenses = operating + taxesAndOther;
  const grossProfit = netSales - cogs;
  const netProfit = grossProfit - profitLossExpenses;

  const daily = listDays(range).map((date) => {
    const daySalesAmount = daySales.get(date) ?? 0;
    const dayCost = dayCogs.get(date) ?? 0;
    const dayExpense = dayExpenses.get(date) ?? 0;
    return {
      date,
      netSales: daySalesAmount,
      cogs: dayCost,
      grossProfit: daySalesAmount - dayCost,
      expenses: dayExpense,
      supplierPayments: daySupplierPayments.get(date) ?? 0,
      netProfit: daySalesAmount - dayCost - dayExpense,
    };
  });

  return {
    billCount: sales.length,
    netSales,
    cogs,
    grossProfit,
    operating,
    taxesAndOther,
    profitLossExpenses,
    supplierPayments,
    allExpenses,
    expenseCount: expenses.length,
    typeBuckets,
    netProfit,
    collected: collectedAgg._sum.amount ?? 0,
    costBySource,
    knownCostRevenue,
    unknownCostRevenue,
    costCoveragePercent: itemRevenue > 0 ? round1((knownCostRevenue / itemRevenue) * 100) : 100,
    gaps,
    daily,
    voidedSales: { billCount: voidedSales._count._all, amount: voidedSales._sum.netTotal ?? 0 },
    voidedExpenses: { count: voidedExpenses._count._all, amount: voidedExpenses._sum.amount ?? 0 },
  };
}

export async function getFinancialReport(query: FinancialReportQuery) {
  const range = resolveReportRange(query);
  const prevRange = previousRange(query.period, range);

  const [current, previous] = await Promise.all([
    computeCore(range, query.topN),
    computeCore(prevRange, 1),
  ]);

  const byType = EXPENSE_TYPES.map((type) => {
    const bucket = current.typeBuckets.get(type);
    const group = groupOf(type);
    return {
      type,
      group,
      inProfitLoss: group !== "SUPPLIER_PAYMENT",
      amount: bucket?.amount ?? 0,
      count: bucket?.count ?? 0,
      sharePercent: percentOf(bucket?.amount ?? 0, current.allExpenses),
    };
  }).sort((a, b) => b.amount - a.amount);

  return {
    period: query.period,
    range: { from: range.from, to: range.to, days: range.days },

    /** The profit and loss statement. Supplier payments are NOT in it (see expense-groups.ts). */
    profitLoss: {
      netSales: current.netSales,
      cogs: current.cogs,
      grossProfit: current.grossProfit,
      grossMarginPercent: marginPercent(current.grossProfit, current.netSales),
      operatingExpenses: current.operating,
      taxesAndOther: current.taxesAndOther,
      totalExpenses: current.profitLossExpenses,
      netProfit: current.netProfit,
      netMarginPercent: marginPercent(current.netProfit, current.netSales),
      /** true while some sold pieces have no known cost: profit is then overstated. */
      isEstimate: current.costCoveragePercent < 100,
    },

    cost: {
      /** Share of sold items (by value) whose cost is known. */
      coveragePercent: current.costCoveragePercent,
      knownCostRevenue: current.knownCostRevenue,
      unknownCostRevenue: current.unknownCostRevenue,
      bySource: COST_SOURCES.map((source) => ({
        source,
        quantity: current.costBySource[source].quantity,
        revenue: current.costBySource[source].revenue,
      })),
      /** Products sold without any known cost, biggest first. Add a cost price to fix. */
      gaps: current.gaps,
    },

    expenses: {
      byType,
      profitLossTotal: current.profitLossExpenses,
      supplierPayments: current.supplierPayments,
      allExpensesTotal: current.allExpenses,
      count: current.expenseCount,
    },

    /** Money in vs money out. Unlike profit, this includes payments to suppliers. */
    cash: {
      collected: current.collected,
      expensesPaid: current.allExpenses,
      netCash: current.collected - current.allExpenses,
    },

    billCount: current.billCount,
    daily: current.daily,

    previous: {
      from: prevRange.from,
      to: prevRange.to,
      netSales: previous.netSales,
      cogs: previous.cogs,
      grossProfit: previous.grossProfit,
      totalExpenses: previous.profitLossExpenses,
      netProfit: previous.netProfit,
      netSalesChangePercent: changePercent(current.netSales, previous.netSales),
      totalExpensesChangePercent: changePercent(current.profitLossExpenses, previous.profitLossExpenses),
      netProfitChangePercent: changePercent(current.netProfit, previous.netProfit),
    },

    voided: { sales: current.voidedSales, expenses: current.voidedExpenses },
    generatedAt: new Date().toISOString(),
  };
}