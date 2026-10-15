import type { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { SALE_PAYMENT_METHODS } from "@muzammil-pos/types";
import type { SalesReportQuery } from "@muzammil-pos/validation";
import { addDays, previousRange, resolveReportRange, toYmd, type ReportRange } from "./report-range";

interface Bucket {
  billCount: number;
  netSales: number;
}

/** Only COMPLETED sales count. Voided ones are reported separately. */
function completedSalesIn(range: ReportRange): Prisma.SaleWhereInput {
  return {
    saleStatus: "COMPLETED",
    saleDate: { gte: range.start, lt: range.endExclusive },
  };
}

function percentOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

/** null when there is nothing to compare against (previous period was 0). */
function changePercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function addToBucket<K>(map: Map<K, Bucket>, key: K, amount: number) {
  const bucket = map.get(key) ?? { billCount: 0, netSales: 0 };
  bucket.billCount += 1;
  bucket.netSales += amount;
  map.set(key, bucket);
}

export async function getSalesReport(query: SalesReportQuery) {
  const range = resolveReportRange(query);
  const prevRange = previousRange(query.period, range);
  const saleWhere = completedSalesIn(range);

  const [sales, voided, previous, paymentGroups, itemGroups] = await Promise.all([
    prisma.sale.findMany({
      where: saleWhere,
      select: {
        saleDate: true,
        subTotal: true,
        discountTotal: true,
        netTotal: true,
        paymentStatus: true,
        cashierId: true,
        salesmanId: true,
      },
    }),
    prisma.sale.aggregate({
      where: { saleStatus: "VOID", saleDate: { gte: range.start, lt: range.endExclusive } },
      _count: { _all: true },
      _sum: { netTotal: true },
    }),
    prisma.sale.aggregate({
      where: completedSalesIn(prevRange),
      _count: { _all: true },
      _sum: { netTotal: true },
    }),
    prisma.salePayment.groupBy({
      by: ["method"],
      where: { sale: saleWhere },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.saleItem.groupBy({
      by: ["productId"],
      where: { sale: saleWhere },
      _sum: { quantity: true, lineTotal: true },
    }),
  ]);

  // ---- Totals, the day-by-day series, and per-cashier / per-salesman buckets ----
  let grossSales = 0;
  let discountTotal = 0;
  let netSales = 0;
  let paidBills = 0;
  let partialBills = 0;
  let unpaidBills = 0;

  // Every day in the range gets a row, so a chart has no gaps.
  const dayBuckets = new Map<string, Bucket>();
  for (let day = range.start; day.getTime() < range.endExclusive.getTime(); day = addDays(day, 1)) {
    dayBuckets.set(toYmd(day), { billCount: 0, netSales: 0 });
  }
  const cashierBuckets = new Map<string, Bucket>();
  const salesmanBuckets = new Map<string | null, Bucket>();

  for (const sale of sales) {
    grossSales += sale.subTotal;
    discountTotal += sale.discountTotal;
    netSales += sale.netTotal;

    if (sale.paymentStatus === "PAID") paidBills++;
    else if (sale.paymentStatus === "PARTIAL") partialBills++;
    else unpaidBills++;

    addToBucket(dayBuckets, toYmd(sale.saleDate), sale.netTotal);
    addToBucket(cashierBuckets, sale.cashierId, sale.netTotal);
    addToBucket(salesmanBuckets, sale.salesmanId, sale.netTotal);
  }

  const billCount = sales.length;
  const averageBill = billCount > 0 ? Math.round(netSales / billCount) : 0;

  const daily = [...dayBuckets.entries()].map(([date, bucket]) => ({
    date,
    billCount: bucket.billCount,
    netSales: bucket.netSales,
  }));

  // Ties go to the earlier day.
  let highestSalesDay: (typeof daily)[number] | null = null;
  for (const day of daily) {
    if (day.billCount > 0 && (highestSalesDay === null || day.netSales > highestSalesDay.netSales)) {
      highestSalesDay = day;
    }
  }

  // ---- Payment methods (all four always listed) ----
  const paymentByMethod = new Map(paymentGroups.map((g) => [g.method, g] as const));
  const collected = paymentGroups.reduce((sum, g) => sum + (g._sum.amount ?? 0), 0);
  const byPaymentMethod = SALE_PAYMENT_METHODS.map((method) => {
    const group = paymentByMethod.get(method);
    const amount = group?._sum.amount ?? 0;
    return {
      method,
      amount,
      paymentCount: group?._count._all ?? 0,
      sharePercent: percentOf(amount, collected),
    };
  }).sort((a, b) => b.amount - a.amount);
  const outstanding = Math.max(netSales - collected, 0);

  // ---- Top-selling products ----
  const itemRows = itemGroups.map((g) => ({
    productId: g.productId,
    quantity: g._sum.quantity ?? 0,
    revenue: g._sum.lineTotal ?? 0,
  }));
  const itemsSold = itemRows.reduce((sum, r) => sum + r.quantity, 0);
  const productRevenue = itemRows.reduce((sum, r) => sum + r.revenue, 0);

  const topByQuantity = [...itemRows]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, query.topN);
  const topByRevenue = [...itemRows]
    .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
    .slice(0, query.topN);

  // ---- Names for everything we are about to return ----
  const topProductIds = [...new Set([...topByQuantity, ...topByRevenue].map((r) => r.productId))];
  const salesmanIds = [...salesmanBuckets.keys()].filter((id): id is string => id !== null);

  const [cashiers, salesmen, products] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: [...cashierBuckets.keys()] } },
      select: { id: true, fullName: true, username: true },
    }),
    prisma.salesman.findMany({
      where: { id: { in: salesmanIds } },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, productCode: true, category: { select: { name: true } } },
    }),
  ]);

  const cashierById = new Map(cashiers.map((c) => [c.id, c] as const));
  const salesmanById = new Map(salesmen.map((s) => [s.id, s] as const));
  const productById = new Map(products.map((p) => [p.id, p] as const));

  const toProductRow = (row: (typeof itemRows)[number], shareOf: "quantity" | "revenue") => {
    const product = productById.get(row.productId);
    return {
      productId: row.productId,
      name: product?.name ?? "Deleted product",
      productCode: product?.productCode ?? "",
      categoryName: product?.category.name ?? null,
      quantity: row.quantity,
      revenue: row.revenue,
      sharePercent:
        shareOf === "quantity" ? percentOf(row.quantity, itemsSold) : percentOf(row.revenue, productRevenue),
    };
  };

  const byCashier = [...cashierBuckets.entries()]
    .map(([cashierId, bucket]) => {
      const user = cashierById.get(cashierId);
      return {
        cashierId,
        name: user?.fullName ?? "Unknown user",
        username: user?.username ?? "",
        billCount: bucket.billCount,
        netSales: bucket.netSales,
        averageBill: Math.round(bucket.netSales / bucket.billCount),
        sharePercent: percentOf(bucket.netSales, netSales),
      };
    })
    .sort((a, b) => b.netSales - a.netSales);

  const bySalesman = [...salesmanBuckets.entries()]
    .map(([salesmanId, bucket]) => ({
      salesmanId,
      name: salesmanId === null ? "No salesman" : (salesmanById.get(salesmanId)?.name ?? "Unknown salesman"),
      billCount: bucket.billCount,
      netSales: bucket.netSales,
      averageBill: Math.round(bucket.netSales / bucket.billCount),
      sharePercent: percentOf(bucket.netSales, netSales),
    }))
    .sort((a, b) => b.netSales - a.netSales);

  const previousNet = previous._sum.netTotal ?? 0;
  const previousCount = previous._count._all;

  return {
    period: query.period,
    range: { from: range.from, to: range.to, days: range.days },
    summary: {
      billCount,
      itemsSold,
      grossSales,
      discountTotal,
      netSales,
      averageBill,
      collected,
      outstanding,
      paidBills,
      partialBills,
      unpaidBills,
    },
    previous: {
      from: prevRange.from,
      to: prevRange.to,
      netSales: previousNet,
      billCount: previousCount,
      netSalesChangePercent: changePercent(netSales, previousNet),
      billCountChangePercent: changePercent(billCount, previousCount),
    },
    voided: {
      billCount: voided._count._all,
      amount: voided._sum.netTotal ?? 0,
    },
    highestSalesDay,
    daily,
    byPaymentMethod,
    byCashier,
    bySalesman,
    topProducts: {
      byQuantity: topByQuantity.map((r) => toProductRow(r, "quantity")),
      byRevenue: topByRevenue.map((r) => toProductRow(r, "revenue")),
    },
    generatedAt: new Date().toISOString(),
  };
}