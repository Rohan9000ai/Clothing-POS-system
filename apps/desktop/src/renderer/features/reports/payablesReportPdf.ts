import { formatCurrency } from "@muzammil-pos/utils";
import type { PayablesReport } from "../../services/reports";
import { escapeHtml } from "../../utils/receiptTemplates";
import { pdfBars, pdfDocument, pdfKpis, pdfSection, pdfTable } from "./pdfKit";
import { formatDayMedium, plural } from "./reportFormat";

export function buildPayablesReportHtml(report: PayablesReport, shopName: string): string {
  const { summary } = report;
  const owed = report.suppliers.filter((row) => row.remaining > 0);
  const listed = report.suppliers.filter((row) => row.remaining !== 0);

  const kpis = pdfKpis([
    { label: "You owe suppliers", value: formatCurrency(summary.totalOwed), note: `${plural(summary.owedSupplierCount, "supplier")}` },
    { label: "Advance paid", value: formatCurrency(summary.totalAdvance), note: `${plural(summary.advanceSupplierCount, "supplier")} overpaid` },
    { label: "Bills received", value: formatCurrency(summary.totalPurchased), note: "All time" },
    { label: "Paid so far", value: formatCurrency(summary.totalPaid), note: "All time" },
  ]);

  const bars = pdfBars(
    owed.slice(0, 10).map((row) => ({
      label: row.name,
      value: formatCurrency(row.remaining),
      detail: `${row.sharePercent}% of everything you owe`,
      percent: row.sharePercent,
    })),
    "#DC2626"
  );

  const table = pdfTable(
    [
      { label: "Supplier" },
      { label: "Opening", align: "right" },
      { label: "Bills", align: "right" },
      { label: "Adjust.", align: "right" },
      { label: "Paid", align: "right" },
      { label: "Remaining", align: "right" },
      { label: "Last payment", align: "right" },
    ],
    listed.map((row) => [
      `<strong>${escapeHtml(row.name)}</strong><div class="sub">${escapeHtml(row.phone)}${
        row.status === "INACTIVE" ? " · inactive" : ""
      }</div>`,
      formatCurrency(row.openingBalance),
      formatCurrency(row.purchases),
      formatCurrency(row.adjustments),
      formatCurrency(row.paid),
      row.remaining > 0
        ? `<strong>${formatCurrency(row.remaining)}</strong>`
        : `${formatCurrency(-row.remaining)} advance`,
      row.lastPaymentDate ? formatDayMedium(row.lastPaymentDate) : "—",
    ]),
    "You owe nothing to any supplier."
  );

  const settled = summary.supplierCount - listed.length;

  const body = `
    ${kpis}
    ${owed.length > 0 ? pdfSection("Who you owe most", bars) : ""}
    ${pdfSection("Supplier balances", table, { keep: false })}
    <div class="note">Remaining = opening balance + bills + adjustments − payments.${
      settled > 0 ? ` ${plural(settled, "supplier")} with nothing owed ${settled === 1 ? "is" : "are"} not listed.` : ""
    }</div>
  `;

  return pdfDocument({
    title: "Payables report",
    shopName,
    rangeLabel: "Balances right now",
    generatedAt: report.generatedAt,
    body,
  });
}