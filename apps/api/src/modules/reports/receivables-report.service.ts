import { prisma } from "../../database/prisma";
import { percentOf } from "./report-math";
import { toYmd } from "./report-range";

const AGING = [
  { key: "0-7", label: "0–7 days", from: 0, to: 7 },
  { key: "8-30", label: "8–30 days", from: 8, to: 30 },
  { key: "31-60", label: "31–60 days", from: 31, to: 60 },
  { key: "61-90", label: "61–90 days", from: 61, to: 90 },
  { key: "90+", label: "Over 90 days", from: 91, to: Number.POSITIVE_INFINITY },
];

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Money customers still owe: completed bills that are only partly paid or not paid at all. */
export async function getReceivablesReport() {
  const today = startOfLocalDay(new Date());

  const sales = await prisma.sale.findMany({
    where: { saleStatus: "COMPLETED", paymentStatus: { in: ["PARTIAL", "UNPAID"] } },
    select: {
      id: true,
      billNo: true,
      saleDate: true,
      netTotal: true,
      paymentStatus: true,
      customer: { select: { id: true, name: true } },
      salesman: { select: { name: true } },
      payments: { select: { amount: true } },
    },
    orderBy: { saleDate: "asc" },
  });

  const bills = sales
    .map((sale) => {
      const paid = sale.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const daysOpen = Math.max(
        0,
        Math.round((today.getTime() - startOfLocalDay(sale.saleDate).getTime()) / 86_400_000)
      );
      return {
        saleId: sale.id,
        billNo: sale.billNo,
        saleDate: sale.saleDate.toISOString(),
        customerId: sale.customer.id,
        customerName: sale.customer.name,
        salesmanName: sale.salesman?.name ?? null,
        netTotal: sale.netTotal,
        paid,
        outstanding: sale.netTotal - paid,
        paymentStatus: sale.paymentStatus as "PARTIAL" | "UNPAID",
        daysOpen,
      };
    })
    .filter((bill) => bill.outstanding > 0);

  const totalOutstanding = bills.reduce((sum, bill) => sum + bill.outstanding, 0);
  const totalBilled = bills.reduce((sum, bill) => sum + bill.netTotal, 0);
  const totalPaid = bills.reduce((sum, bill) => sum + bill.paid, 0);

  const aging = AGING.map((bucket) => {
    const inBucket = bills.filter((bill) => bill.daysOpen >= bucket.from && bill.daysOpen <= bucket.to);
    const amount = inBucket.reduce((sum, bill) => sum + bill.outstanding, 0);
    return {
      key: bucket.key,
      label: bucket.label,
      billCount: inBucket.length,
      amount,
      sharePercent: percentOf(amount, totalOutstanding),
    };
  });

  const customers = new Map<string, { name: string; billCount: number; outstanding: number; oldestDays: number }>();
  for (const bill of bills) {
    const entry = customers.get(bill.customerId) ?? {
      name: bill.customerName,
      billCount: 0,
      outstanding: 0,
      oldestDays: 0,
    };
    entry.billCount += 1;
    entry.outstanding += bill.outstanding;
    entry.oldestDays = Math.max(entry.oldestDays, bill.daysOpen);
    customers.set(bill.customerId, entry);
  }

  const byCustomer = [...customers.entries()]
    .map(([customerId, entry]) => ({
      customerId,
      name: entry.name,
      billCount: entry.billCount,
      outstanding: entry.outstanding,
      oldestDays: entry.oldestDays,
      sharePercent: percentOf(entry.outstanding, totalOutstanding),
    }))
    .sort((a, b) => b.outstanding - a.outstanding);

  // Bills are already oldest first.
  const oldest = bills[0] ?? null;

  return {
    asOf: toYmd(today),
    summary: {
      totalOutstanding,
      billCount: bills.length,
      customerCount: byCustomer.length,
      totalBilled,
      totalPaid,
      partialCount: bills.filter((bill) => bill.paymentStatus === "PARTIAL").length,
      unpaidCount: bills.filter((bill) => bill.paymentStatus === "UNPAID").length,
      oldestDays: oldest ? oldest.daysOpen : null,
      oldestBillNo: oldest ? oldest.billNo : null,
    },
    aging,
    byCustomer,
    bills: bills.map(({ customerId: _customerId, ...bill }) => bill),
    generatedAt: new Date().toISOString(),
  };
}