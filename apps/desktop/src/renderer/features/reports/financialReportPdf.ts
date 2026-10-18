import { formatCurrency } from "@muzammil-pos/utils";
import type { FinancialReport } from "../../services/reports";
import { escapeHtml } from "../../utils/receiptTemplates";
import { describeRange } from "../expenses/expenseRange";
import { EXPENSE_TYPE_LABELS } from "../expenses/expenseMeta";
import { financialChartsSvg } from "./charts";
import { pdfBars, pdfDocument, pdfKpis, pdfSection, pdfTable } from "./pdfKit";
import { describeChange, percentChange, plural } from "./reportFormat";

const SOURCE_LABELS = {
  PRODUCT_COST_PRICE: "Product cost price",
  SUPPLIER_BILL: "Latest supplier bill",
  UNKNOWN: "Not known",
} as const;

function margin(value: number | null): string {
  return value === null ? "—" : `${value}% of sales`;
}

export function buildFinancialReportHtml(report: FinancialReport, shopName: string): string {
  const { profitLoss: pl, previous, cash, cost, expenses, voided } = report;
  const compare = "vs previous period";
  const salesChange = describeChange(previous.netSalesChangePercent, true, compare);
  const grossChange = describeChange(percentChange(pl.grossProfit, previous.grossProfit), true, compare);
  const expenseChange = describeChange(previous.totalExpensesChangePercent, false, compare);
  const profitChange = describeChange(previous.netProfitChangePercent, true, compare);
  const charts = financialChartsSvg(report);

  const kpis = pdfKpis([
    { label: "Net sales", value: formatCurrency(pl.netSales), note: salesChange.text, tone: salesChange.tone },
    { label: "Gross profit", value: formatCurrency(pl.grossProfit), note: grossChange.text, tone: grossChange.tone },
    {
      label: "Running expenses",
      value: formatCurrency(pl.totalExpenses),
      note: expenseChange.text,
      tone: expenseChange.tone,
    },
    {
      label: pl.isEstimate ? "Net profit (estimate)" : "Net profit",
      value: formatCurrency(pl.netProfit),
      note: profitChange.text,
      tone: profitChange.tone,
    },
  ]);

  const statement = pdfTable(
    [{ label: "" }, { label: "Amount", align: "right" }, { label: "Margin", align: "right" }],
    [
      ["Net sales", formatCurrency(pl.netSales), ""],
      ["Less: cost of goods sold", formatCurrency(pl.cogs), ""],
      ["<strong>Gross profit</strong>", `<strong>${formatCurrency(pl.grossProfit)}</strong>`, margin(pl.grossMarginPercent)],
      ["Less: operating expenses (electricity, salaries, payouts)", formatCurrency(pl.operatingExpenses), ""],
      ["Less: taxes and other", formatCurrency(pl.taxesAndOther), ""],
      ["<strong>Net profit</strong>", `<strong>${formatCurrency(pl.netProfit)}</strong>`, margin(pl.netMarginPercent)],
    ],
    "No data."
  );

  const costTable = pdfTable(
    [{ label: "How the cost of each piece was found" }, { label: "Pieces", align: "right" }, { label: "Sold for", align: "right" }],
    cost.bySource.map((row) => [SOURCE_LABELS[row.source], String(row.quantity), formatCurrency(row.revenue)]),
    "No sales in this period."
  );

  const gaps =
    cost.gaps.length > 0
      ? pdfTable(
          [{ label: "Products sold without a known cost" }, { label: "Pieces", align: "right" }, { label: "Sold for", align: "right" }],
          cost.gaps.map((gap) => [escapeHtml(gap.name), String(gap.quantity), formatCurrency(gap.revenue)]),
          ""
        )
      : "";

  const cashTable = pdfTable(
    [{ label: "Cash view" }, { label: "Amount", align: "right" }],
    [
      ["Money received from customers", formatCurrency(cash.collected)],
      ["Money paid out (all expenses, including supplier payments)", formatCurrency(cash.expensesPaid)],
      ["<strong>Net cash</strong>", `<strong>${formatCurrency(cash.netCash)}</strong>`],
    ],
    "No data."
  );

  const byType = pdfBars(
    expenses.byType.map((row) => ({
      label: EXPENSE_TYPE_LABELS[row.type],
      value: formatCurrency(row.amount),
      detail: `${plural(row.count, "entry", "entries")} · ${row.sharePercent}% of all expenses`,
      percent: row.sharePercent,
      tag: row.inProfitLoss ? undefined : "Not in profit",
    })),
    "#DC2626"
  );

  const estimateNote = pl.isEstimate
    ? `<div class="note"><strong>This profit is an estimate.</strong> The cost is known for ${cost.coveragePercent}% of what was sold. Pieces with no known cost count as free, so real profit is lower. Add a cost price in Inventory or record the supplier's bill to fix this.</div>`
    : "";

  const body = `
    ${kpis}
    <div class="caption">Compared with ${escapeHtml(describeRange({ from: previous.from, to: previous.to }))}.</div>
    ${estimateNote}
    ${pdfSection("Profit and loss", statement, {
      caption: `Money paid to suppliers (${formatCurrency(expenses.supplierPayments)}) is not a cost here: it is the cost of stock, which reaches profit as "cost of goods" when the stock is sold.`,
    })}
    ${pdfSection(`Sales and costs by ${charts.grain}`, charts.salesAndCosts)}
    ${pdfSection(`Net profit by ${charts.grain}`, charts.profit, { caption: "Green bars are profit, red bars are a loss." })}
    ${pdfSection("Cash view", cashTable, { caption: "Unlike profit, this counts every payment to suppliers on the day it was made." })}
    ${pdfSection("Expenses by type", byType)}
    ${pdfSection("Cost of goods sold", costTable + gaps, { keep: false })}
    <div class="note">${plural(report.billCount, "bill")} counted.${
      voided.sales.billCount > 0 ? ` ${plural(voided.sales.billCount, "voided bill")} excluded.` : ""
    }${voided.expenses.count > 0 ? ` ${plural(voided.expenses.count, "deleted expense")} excluded.` : ""}</div>
  `;

  return pdfDocument({
    title: "Profit and loss report",
    shopName,
    rangeLabel: describeRange({ from: report.range.from, to: report.range.to }),
    generatedAt: report.generatedAt,
    body,
  });
}