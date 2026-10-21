import { prisma } from "../../database/prisma";
import { listLowStock } from "../inventory/stock.service";
import { getSettings } from "../settings/settings.service";
import { groupOf } from "../reports/expense-groups";
import { addDays, buildRange, resolveReportRange, toYmd, utcBounds, utcYmd } from "../reports/report-range";

const RECENT_SALES_LIMIT = 8;
const LOW_STOCK_LIMIT = 8;

interface DayTotals {
  netSales: number;
  billCount: number;
}

/**
 * Everything the admin dashboard shows, in one call.
 * "Today" and the day boundaries follow the clock of the PC running the API.
 */
export async function getDashboard() {
  const todayRange = resolveReportRange({ period: "day" });
  const todayStart = todayRange.start;
  const todayYmd = todayRange.from;
  const yesterdayYmd = toYmd(addDays(todayStart, -1));

  const week = buildRange(addDays(todayStart, -6), todayStart);
  // Expenses are stored as the chosen calendar day at UTC midnight, so they use UTC bounds.
  const expenseBounds = utcBounds(buildRange(addDays(todayStart, -1), todayStart));

  const completedInWeek = {
    saleStatus: "COMPLETED",
    saleDate: { gte: week.start, lt: week.endExclusive },
  };

  const [weekSales, recent, expenses, stockTotals, productCount, lowStockAll, settings] = await Promise.all([
    prisma.sale.findMany({ where: completedInWeek, select: { saleDate: true, netTotal: true } }),
    prisma.sale.findMany({
      where: completedInWeek,
      orderBy: [{ saleDate: "desc" }, { createdAt: "desc" }],
      take: RECENT_SALES_LIMIT,
      select: {
        id: true,
        billNo: true,
        saleDate: true,
        netTotal: true,
        paymentStatus: true,
        customer: { select: { name: true } },
        salesman: { select: { id: true, name: true } },
        payments: { select: { method: true } },
      },
    }),
    prisma.expense.findMany({
      where: { status: "ACTIVE", expenseDate: { gte: expenseBounds.start, lt: expenseBounds.endExclusive } },
      select: { expenseDate: true, amount: true, type: true },
    }),
    prisma.productVariant.aggregate({ _sum: { quantity: true }, _count: { _all: true } }),
    prisma.product.count(),
    listLowStock(),
    getSettings(),
  ]);

  // ---- Sales: one bucket per day for the last 7 days, empty days included ----
  const daily = new Map<string, DayTotals>();
  for (let day = week.start; day.getTime() < week.endExclusive.getTime(); day = addDays(day, 1)) {
    daily.set(toYmd(day), { netSales: 0, billCount: 0 });
  }
  for (const sale of weekSales) {
    const bucket = daily.get(toYmd(sale.saleDate));
    if (bucket) {
      bucket.netSales += sale.netTotal;
      bucket.billCount += 1;
    }
  }
  const dailyList = [...daily.entries()].map(([date, totals]) => ({ date, ...totals }));
  const weekTotal = dailyList.reduce(
    (sum, day) => ({ netSales: sum.netSales + day.netSales, billCount: sum.billCount + day.billCount }),
    { netSales: 0, billCount: 0 }
  );
  const emptyDay: DayTotals = { netSales: 0, billCount: 0 };
  const todaySales = daily.get(todayYmd) ?? emptyDay;
  const yesterdaySales = daily.get(yesterdayYmd) ?? emptyDay;

  // ---- Expenses: today and yesterday ----
  let expensesToday = 0;
  let expenseCountToday = 0;
  let supplierPaymentsToday = 0;
  let expensesYesterday = 0;
  for (const expense of expenses) {
    const day = utcYmd(expense.expenseDate);
    if (day === todayYmd) {
      expensesToday += expense.amount;
      expenseCountToday += 1;
      if (groupOf(expense.type) === "SUPPLIER_PAYMENT") supplierPaymentsToday += expense.amount;
    } else if (day === yesterdayYmd) {
      expensesYesterday += expense.amount;
    }
  }

  // ---- Low stock: already sorted with the lowest first ----
  const lowStock = {
    threshold: settings.lowStockThreshold,
    total: lowStockAll.length,
    outOfStock: lowStockAll.filter((row) => row.quantity === 0).length,
    items: lowStockAll.slice(0, LOW_STOCK_LIMIT),
  };

  return {
    todayDate: todayYmd,
    generatedAt: new Date().toISOString(),
    today: {
      netSales: todaySales.netSales,
      billCount: todaySales.billCount,
      expensesTotal: expensesToday,
      expensesCount: expenseCountToday,
      supplierPayments: supplierPaymentsToday,
    },
    yesterday: {
      netSales: yesterdaySales.netSales,
      billCount: yesterdaySales.billCount,
      expensesTotal: expensesYesterday,
    },
    stock: {
      totalPieces: stockTotals._sum.quantity ?? 0,
      productCount,
      variantCount: stockTotals._count._all,
    },
    salesLast7Days: { total: weekTotal, daily: dailyList },
    recentSales: recent.map((sale) => ({
      saleId: sale.id,
      billNo: sale.billNo,
      saleDate: sale.saleDate.toISOString(),
      customerName: sale.customer.name,
      paymentMethods: [...new Set(sale.payments.map((payment) => payment.method))],
      paymentStatus: sale.paymentStatus,
      netTotal: sale.netTotal,
      salesman: sale.salesman ? { id: sale.salesman.id, name: sale.salesman.name } : null,
    })),
    lowStock,
  };
}