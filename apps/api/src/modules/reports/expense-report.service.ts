import type { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { EXPENSE_TYPES, PAYOUT_METHODS } from "@muzammil-pos/types";
import type { ExpenseReportQuery } from "@muzammil-pos/validation";
import { listDays, previousRange, resolveReportRange, utcBounds, utcYmd } from "./report-range";
import { addTo, changePercent, percentOf, type Bucket } from "./report-math";
import { groupOf } from "./expense-groups";

function activeIn(bounds: { start: Date; endExclusive: Date }): Prisma.ExpenseWhereInput {
  return { status: "ACTIVE", expenseDate: { gte: bounds.start, lt: bounds.endExclusive } };
}

export async function getExpenseReport(query: ExpenseReportQuery) {
  const range = resolveReportRange(query);
  const prevRange = previousRange(query.period, range);
  const bounds = utcBounds(range);

  const [expenses, voided, previous] = await Promise.all([
    prisma.expense.findMany({
      where: activeIn(bounds),
      select: {
        id: true,
        expenseDate: true,
        title: true,
        type: true,
        amount: true,
        paymentMethod: true,
        supplier: { select: { name: true } },
        salesman: { select: { name: true } },
      },
    }),
    prisma.expense.aggregate({
      where: { status: "VOID", expenseDate: { gte: bounds.start, lt: bounds.endExclusive } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: activeIn(utcBounds(prevRange)),
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  let total = 0;
  let operating = 0;
  let taxesAndOther = 0;
  let supplierPayments = 0;

  const typeBuckets = new Map<string, Bucket>();
  const methodBuckets = new Map<string, Bucket>();
  const dayBuckets = new Map<string, Bucket>();

  for (const expense of expenses) {
    total += expense.amount;

    const group = groupOf(expense.type);
    if (group === "OPERATING") operating += expense.amount;
    else if (group === "TAXES_AND_OTHER") taxesAndOther += expense.amount;
    else supplierPayments += expense.amount;

    addTo(typeBuckets, expense.type, expense.amount);
    addTo(methodBuckets, expense.paymentMethod, expense.amount);
    addTo(dayBuckets, utcYmd(expense.expenseDate), expense.amount);
  }

  const count = expenses.length;

  // All six types and both methods are always listed, so a chart doesn't jump around.
  const byType = EXPENSE_TYPES.map((type) => {
    const bucket = typeBuckets.get(type);
    const group = groupOf(type);
    return {
      type,
      group,
      /** false for supplier payments: shown here, but not counted in profit. */
      inProfitLoss: group !== "SUPPLIER_PAYMENT",
      amount: bucket?.amount ?? 0,
      count: bucket?.count ?? 0,
      sharePercent: percentOf(bucket?.amount ?? 0, total),
    };
  }).sort((a, b) => b.amount - a.amount);

  const byPaymentMethod = PAYOUT_METHODS.map((method) => {
    const bucket = methodBuckets.get(method);
    return {
      method,
      amount: bucket?.amount ?? 0,
      count: bucket?.count ?? 0,
      sharePercent: percentOf(bucket?.amount ?? 0, total),
    };
  }).sort((a, b) => b.amount - a.amount);

  const daily = listDays(range).map((date) => ({
    date,
    amount: dayBuckets.get(date)?.amount ?? 0,
    count: dayBuckets.get(date)?.count ?? 0,
  }));

  // Ties go to the earlier day.
  let highestExpenseDay: (typeof daily)[number] | null = null;
  for (const day of daily) {
    if (day.count > 0 && (highestExpenseDay === null || day.amount > highestExpenseDay.amount)) {
      highestExpenseDay = day;
    }
  }

  const largestExpenses = [...expenses]
    .sort((a, b) => b.amount - a.amount || b.expenseDate.getTime() - a.expenseDate.getTime())
    .slice(0, query.topN)
    .map((e) => ({
      id: e.id,
      date: utcYmd(e.expenseDate),
      title: e.title,
      type: e.type,
      amount: e.amount,
      paymentMethod: e.paymentMethod,
      supplierName: e.supplier?.name ?? null,
      salesmanName: e.salesman?.name ?? null,
      inProfitLoss: groupOf(e.type) !== "SUPPLIER_PAYMENT",
    }));

  const previousTotal = previous._sum.amount ?? 0;
  const previousCount = previous._count._all;

  return {
    period: query.period,
    range: { from: range.from, to: range.to, days: range.days },
    summary: {
      total,
      count,
      average: count > 0 ? Math.round(total / count) : 0,
      /** Running costs that reduce profit: operating + taxes & other. */
      profitLossExpenses: operating + taxesAndOther,
      operating,
      taxesAndOther,
      /** Paid to suppliers for stock. Not part of profit. */
      supplierPayments,
    },
    previous: {
      from: prevRange.from,
      to: prevRange.to,
      total: previousTotal,
      count: previousCount,
      totalChangePercent: changePercent(total, previousTotal),
      countChangePercent: changePercent(count, previousCount),
    },
    voided: {
      count: voided._count._all,
      amount: voided._sum.amount ?? 0,
    },
    highestExpenseDay,
    daily,
    byType,
    byPaymentMethod,
    largestExpenses,
    generatedAt: new Date().toISOString(),
  };
}