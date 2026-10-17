import { formatCurrency } from "@muzammil-pos/utils";
import type { ExpenseReport } from "../../services/reports";
import { escapeHtml } from "../../utils/receiptTemplates";
import { describeRange } from "../expenses/expenseRange";
import { EXPENSE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "../expenses/expenseMeta";
import { expenseChartSvg } from "./charts";
import { pdfBars, pdfDocument, pdfKpis, pdfSection, pdfTable } from "./pdfKit";
import { describeChange, formatDayFull, formatDayMedium, plural } from "./reportFormat";

export function buildExpenseReportHtml(report: ExpenseReport, shopName: string): string {
  const { summary, previous, voided, highestExpenseDay } = report;
  const totalChange = describeChange(previous.totalChangePercent, false, "vs previous period");
  const countChange = describeChange(previous.countChangePercent, false, "vs previous period");
  const { svg, grain } = expenseChartSvg(report);

  const kpis = pdfKpis([
    { label: "Total expenses", value: formatCurrency(summary.total), note: totalChange.text, tone: totalChange.tone },
    { label: "Entries", value: String(summary.count), note: countChange.text, tone: countChange.tone },
    { label: "Running costs", value: formatCurrency(summary.profitLossExpenses), note: "Counted in profit" },
    { label: "Paid to suppliers", value: formatCurrency(summary.supplierPayments), note: "Stock money, not in profit" },
  ]);

  const facts = pdfKpis([
    { label: "Average expense", value: formatCurrency(summary.average) },
    { label: "Operating", value: formatCurrency(summary.operating), note: "Electricity, salaries, payouts" },
    { label: "Taxes and other", value: formatCurrency(summary.taxesAndOther) },
    {
      label: "Highest expense day",
      value: highestExpenseDay ? formatDayMedium(highestExpenseDay.date) : "—",
      note: highestExpenseDay
        ? `${formatCurrency(highestExpenseDay.amount)} · ${plural(highestExpenseDay.count, "entry", "entries")}`
        : undefined,
    },
  ]);

  const byType = pdfBars(
    report.byType.map((row) => ({
      label: EXPENSE_TYPE_LABELS[row.type],
      value: formatCurrency(row.amount),
      detail: `${plural(row.count, "entry", "entries")} · ${row.sharePercent}% of all expenses`,
      percent: row.sharePercent,
      tag: row.inProfitLoss ? undefined : "Not in profit",
    })),
    "#DC2626"
  );

  const byMethod = pdfBars(
    report.byPaymentMethod.map((row) => ({
      label: PAYMENT_METHOD_LABELS[row.method],
      value: formatCurrency(row.amount),
      detail: `${plural(row.count, "entry", "entries")} · ${row.sharePercent}% of all expenses`,
      percent: row.sharePercent,
    })),
    "#F87171"
  );

  const largest = pdfTable(
    [
      { label: "Date" },
      { label: "Title" },
      { label: "Type" },
      { label: "Method" },
      { label: "Amount", align: "right" },
    ],
    report.largestExpenses.map((row) => {
      const links = [
        row.supplierName ? `Supplier: ${row.supplierName}` : null,
        row.salesmanName ? `Salesman: ${row.salesmanName}` : null,
      ]
        .filter((link): link is string => link !== null)
        .join(" · ");
      return [
        formatDayMedium(row.date),
        `<strong>${escapeHtml(row.title)}</strong>${links ? `<div class="sub">${escapeHtml(links)}</div>` : ""}`,
        EXPENSE_TYPE_LABELS[row.type],
        PAYMENT_METHOD_LABELS[row.paymentMethod],
        formatCurrency(row.amount),
      ];
    }),
    "No expenses in this period."
  );

  const body = `
    ${kpis}
    ${facts}
    <div class="caption">Compared with ${escapeHtml(describeRange({ from: previous.from, to: previous.to }))}.</div>
    ${pdfSection(`Expenses by ${grain}`, svg, { caption: "The darkest bar is the biggest " + grain + "." })}
    ${pdfSection("Expenses by type", byType, { caption: "Payments to suppliers are shown here but are not counted in profit: that money is the cost of stock, which reaches profit when the stock is sold." })}
    ${pdfSection("Payment method", byMethod)}
    ${pdfSection("Largest expenses", largest, { keep: false })}
    <div class="note">${
      voided.count > 0
        ? `${plural(voided.count, "deleted expense")} (${formatCurrency(voided.amount)}) are not included in any figure above.`
        : "Deleted expenses are never included in these figures."
    }${highestExpenseDay ? ` Highest day: ${escapeHtml(formatDayFull(highestExpenseDay.date))}.` : ""}</div>
  `;

  return pdfDocument({
    title: "Expense report",
    shopName,
    rangeLabel: describeRange({ from: report.range.from, to: report.range.to }),
    generatedAt: report.generatedAt,
    body,
  });
}