import { formatCurrency, formatDate } from "@muzammil-pos/utils";
import type { ReceivablesReport } from "../../services/reports";
import { escapeHtml } from "../../utils/receiptTemplates";
import { pdfBars, pdfDocument, pdfKpis, pdfSection, pdfTable } from "./pdfKit";
import { formatDayMedium, plural } from "./reportFormat";

export function buildReceivablesReportHtml(report: ReceivablesReport, shopName: string): string {
  const { summary } = report;

  const kpis = pdfKpis([
    { label: "Total to collect", value: formatCurrency(summary.totalOutstanding) },
    { label: "Open bills", value: String(summary.billCount), note: `${summary.partialCount} partly paid · ${summary.unpaidCount} unpaid` },
    { label: "Customers", value: String(summary.customerCount) },
    {
      label: "Oldest open bill",
      value: summary.oldestDays === null ? "—" : plural(summary.oldestDays, "day"),
      note: summary.oldestBillNo ?? undefined,
    },
  ]);

  const aging = pdfBars(
    report.aging.map((row) => ({
      label: row.label,
      value: formatCurrency(row.amount),
      detail: `${plural(row.billCount, "bill")} · ${row.sharePercent}% of the total`,
      percent: row.sharePercent,
    })),
    "#D97706"
  );

  const customers = pdfTable(
    [
      { label: "Customer" },
      { label: "Bills", align: "right" },
      { label: "Oldest", align: "right" },
      { label: "Owes", align: "right" },
    ],
    report.byCustomer.map((row) => [
      escapeHtml(row.name),
      String(row.billCount),
      plural(row.oldestDays, "day"),
      formatCurrency(row.outstanding),
    ]),
    "Nothing is owed to you."
  );

  const bills = pdfTable(
    [
      { label: "Bill" },
      { label: "Date" },
      { label: "Customer" },
      { label: "Bill total", align: "right" },
      { label: "Paid", align: "right" },
      { label: "Owes", align: "right" },
      { label: "Open for", align: "right" },
    ],
    report.bills.map((bill) => [
      `<strong>${escapeHtml(bill.billNo)}</strong><div class="sub">${bill.paymentStatus === "PARTIAL" ? "Partly paid" : "Unpaid"}</div>`,
      formatDate(bill.saleDate),
      escapeHtml(bill.customerName),
      formatCurrency(bill.netTotal),
      formatCurrency(bill.paid),
      formatCurrency(bill.outstanding),
      plural(bill.daysOpen, "day"),
    ]),
    "Every bill is fully paid."
  );

  const body = `
    ${kpis}
    ${pdfSection("How long bills have been open", aging)}
    ${pdfSection("By customer", customers)}
    ${pdfSection("Open bills (oldest first)", bills, { keep: false })}
    <div class="note">Completed bills only. Voided bills are never included.</div>
  `;

  return pdfDocument({
    title: "Receivables report",
    shopName,
    rangeLabel: `As of ${formatDayMedium(report.asOf)}`,
    generatedAt: report.generatedAt,
    body,
  });
}