import { formatCurrency } from "@muzammil-pos/utils";
import type { ProductSalesRow, SalesReport } from "../../services/reports";
import { escapeHtml } from "../../utils/receiptTemplates";
import { describeRange } from "../expenses/expenseRange";
import { salesChartSvg } from "./charts";
import { pdfBars, pdfDocument, pdfKpis, pdfSection, pdfTable } from "./pdfKit";
import { SALE_METHOD_LABELS, describeChange, formatDayFull, formatDayMedium, plural } from "./reportFormat";

function productRows(rows: ProductSalesRow[]): string[][] {
  return rows.map((row, index) => [
    String(index + 1),
    `<strong>${escapeHtml(row.name)}</strong><div class="sub">${escapeHtml(row.productCode)}${
      row.categoryName ? ` · ${escapeHtml(row.categoryName)}` : ""
    }</div>`,
    String(row.quantity),
    formatCurrency(row.revenue),
    `${row.sharePercent}%`,
  ]);
}

const PRODUCT_COLUMNS = [
  { label: "#" },
  { label: "Product" },
  { label: "Pieces", align: "right" as const },
  { label: "Revenue", align: "right" as const },
  { label: "Share", align: "right" as const },
];

export function buildSalesReportHtml(report: SalesReport, shopName: string): string {
  const { summary, previous, voided, highestSalesDay } = report;
  const compare = "vs previous period";
  const netChange = describeChange(previous.netSalesChangePercent, true, compare);
  const billChange = describeChange(previous.billCountChangePercent, true, compare);
  const { svg, grain } = salesChartSvg(report);

  const kpis = pdfKpis([
    { label: "Net sales", value: formatCurrency(summary.netSales), note: netChange.text, tone: netChange.tone },
    { label: "Bills", value: String(summary.billCount), note: billChange.text, tone: billChange.tone },
    { label: "Average bill", value: formatCurrency(summary.averageBill), note: `${plural(summary.itemsSold, "piece")} sold` },
    { label: "Still to collect", value: formatCurrency(summary.outstanding), note: `Collected ${formatCurrency(summary.collected)}` },
  ]);

  const facts = pdfKpis([
    { label: "Gross sales", value: formatCurrency(summary.grossSales) },
    { label: "Discounts given", value: formatCurrency(summary.discountTotal) },
    {
      label: "Highest sales day",
      value: highestSalesDay ? formatDayMedium(highestSalesDay.date) : "—",
      note: highestSalesDay ? formatCurrency(highestSalesDay.netSales) : undefined,
    },
    {
      label: "Bills by payment",
      value: `${summary.paidBills} paid`,
      note: `${summary.partialBills} partial · ${summary.unpaidBills} unpaid`,
    },
  ]);

  const payments = pdfBars(
    report.byPaymentMethod.map((row) => ({
      label: SALE_METHOD_LABELS[row.method],
      value: formatCurrency(row.amount),
      detail: `${plural(row.paymentCount, "payment")} · ${row.sharePercent}% of money collected`,
      percent: row.sharePercent,
    })),
    "#4F46E5"
  );

  const cashierTable = pdfTable(
    [
      { label: "Cashier" },
      { label: "Bills", align: "right" },
      { label: "Net sales", align: "right" },
      { label: "Average", align: "right" },
      { label: "Share", align: "right" },
    ],
    report.byCashier.map((row) => [
      `<strong>${escapeHtml(row.name)}</strong>${row.username ? `<div class="sub">${escapeHtml(row.username)}</div>` : ""}`,
      String(row.billCount),
      formatCurrency(row.netSales),
      formatCurrency(row.averageBill),
      `${row.sharePercent}%`,
    ]),
    "No sales in this period."
  );

  const salesmanTable = pdfTable(
    [
      { label: "Salesman" },
      { label: "Bills", align: "right" },
      { label: "Net sales", align: "right" },
      { label: "Average", align: "right" },
      { label: "Share", align: "right" },
    ],
    report.bySalesman.map((row) => [
      escapeHtml(row.name),
      String(row.billCount),
      formatCurrency(row.netSales),
      formatCurrency(row.averageBill),
      `${row.sharePercent}%`,
    ]),
    "No sales in this period."
  );

  const body = `
    ${kpis}
    ${facts}
    <div class="caption">Compared with ${escapeHtml(describeRange({ from: previous.from, to: previous.to }))}.</div>
    ${pdfSection(`Net sales by ${grain}`, svg, { caption: "The darkest bar is the best " + grain + "." })}
    ${pdfSection("Payment methods", payments, { caption: "Money received, by how the customer paid." })}
    ${pdfSection("Sales by cashier", cashierTable)}
    ${pdfSection("Sales by salesman", salesmanTable)}
    ${pdfSection("Top selling products by pieces", pdfTable(PRODUCT_COLUMNS, productRows(report.topProducts.byQuantity), "No products sold in this period."), { keep: false })}
    ${pdfSection("Top selling products by revenue", pdfTable(PRODUCT_COLUMNS, productRows(report.topProducts.byRevenue), "No products sold in this period."), { keep: false })}
    <div class="note">${
      voided.billCount > 0
        ? `${plural(voided.billCount, "voided bill")} (${formatCurrency(voided.amount)}) are not included in any figure above.`
        : "Voided bills are never included in these figures."
    }${highestSalesDay ? ` Best day: ${escapeHtml(formatDayFull(highestSalesDay.date))}.` : ""}</div>
  `;

  return pdfDocument({
    title: "Sales report",
    shopName,
    rangeLabel: describeRange({ from: report.range.from, to: report.range.to }),
    generatedAt: report.generatedAt,
    body,
  });
}