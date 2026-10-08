import { formatCurrency, formatDateTime } from "@muzammil-pos/utils";
import { EXPENSE_TYPES, type Settings } from "@muzammil-pos/types";
import type { ExpenseDetail } from "../../services/expenses";
import { escapeHtml } from "../../utils/receiptTemplates";
import { EXPENSE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "./expenseMeta";
import { formatExpenseDate } from "./expenseRange";

export interface ExpenseReportInput {
  expenses: ExpenseDetail[];
  settings: Settings;
  /** e.g. "1 Oct 2026 – 31 Oct 2026" */
  rangeLabel: string;
  /** Extra filter lines, e.g. "Type: Taxes". */
  filterLabels: string[];
}

export function buildExpenseReportHtml({ expenses, settings, rangeLabel, filterLabels }: ExpenseReportInput): string {
  // Oldest first reads better on paper than the on-screen newest-first order.
  const sorted = [...expenses].sort(
    (a, b) => a.expenseDate.localeCompare(b.expenseDate) || a.createdAt.localeCompare(b.createdAt)
  );

  const active = sorted.filter((e) => e.status === "ACTIVE");
  const voidedCount = sorted.length - active.length;
  const grandTotal = active.reduce((sum, e) => sum + e.amount, 0);

  const byType = EXPENSE_TYPES.map((type) => {
    const rows = active.filter((e) => e.type === type);
    return { type, count: rows.length, amount: rows.reduce((sum, e) => sum + e.amount, 0) };
  }).filter((row) => row.count > 0);

  const rowsHtml = sorted
    .map((e) => {
      const links = [
        e.supplier ? `Supplier: ${e.supplier.name}` : null,
        e.salesman ? `Salesman: ${e.salesman.name}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      const isVoid = e.status === "VOID";

      return `
      <tr${isVoid ? ' class="void"' : ""}>
        <td class="nowrap">${formatExpenseDate(e.expenseDate)}</td>
        <td>
          <div class="title">${escapeHtml(e.title)}${isVoid ? ' <span class="tag">VOID</span>' : ""}</div>
          ${links ? `<div class="sub">${escapeHtml(links)}</div>` : ""}
        </td>
        <td>${EXPENSE_TYPE_LABELS[e.type]}</td>
        <td>
          ${PAYMENT_METHOD_LABELS[e.paymentMethod]}
          ${e.referenceNo ? `<div class="sub">${escapeHtml(e.referenceNo)}</div>` : ""}
        </td>
        <td class="notes">${e.notes ? escapeHtml(e.notes).replace(/\n/g, "<br/>") : "—"}</td>
        <td class="num">${formatCurrency(e.amount)}</td>
      </tr>`;
    })
    .join("");

  const typeRowsHtml = byType
    .map(
      (row) => `
      <tr>
        <td>${EXPENSE_TYPE_LABELS[row.type]}</td>
        <td class="num">${row.count}</td>
        <td class="num">${formatCurrency(row.amount)}</td>
      </tr>`
    )
    .join("");

  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Expense report</title>
    <style>
      @page { size: A4; margin: 14mm 12mm 18mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 11px; }
      .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; margin-bottom: 12px; }
      .shop { font-size: 18px; font-weight: 700; }
      .report-title { font-size: 13px; color: #4F46E5; font-weight: 600; margin-top: 2px; }
      .meta { text-align: right; color: #6b7280; line-height: 1.5; }
      .filters { margin-bottom: 12px; color: #374151; }
      .filters span { display: inline-block; background: #f3f4f6; border-radius: 999px; padding: 2px 10px; margin-right: 6px; }
      table { width: 100%; border-collapse: collapse; }
      thead { display: table-header-group; }
      thead th { background: #4F46E5; color: #fff; font-size: 10px; text-transform: uppercase; text-align: left; padding: 6px 8px; }
      tbody td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
      tr { page-break-inside: avoid; }
      .num { text-align: right; white-space: nowrap; }
      .nowrap { white-space: nowrap; }
      .sub { color: #6b7280; font-size: 10px; margin-top: 1px; }
      .notes { color: #6b7280; max-width: 150px; }
      tr.void td { color: #9ca3af; }
      tr.void .title, tr.void .num { text-decoration: line-through; }
      .tag { display: inline-block; text-decoration: none; background: #fee2e2; color: #dc2626; border-radius: 4px; padding: 0 5px; font-size: 9px; font-weight: 700; }
      .summary { margin-top: 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; page-break-inside: avoid; }
      .summary table { width: 55%; }
      .summary th { text-align: left; font-size: 10px; text-transform: uppercase; color: #6b7280; padding: 4px 8px; border-bottom: 1px solid #e5e7eb; }
      .summary th.num { text-align: right; }
      .total-box { text-align: right; }
      .total-label { color: #6b7280; font-size: 10px; text-transform: uppercase; }
      .total-value { font-size: 20px; font-weight: 700; margin-top: 2px; }
      .total-note { color: #9ca3af; font-size: 10px; margin-top: 2px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="shop">${escapeHtml(settings.shopName)}</div>
        <div class="report-title">Expense report</div>
      </div>
      <div class="meta">
        <div>${escapeHtml(rangeLabel)}</div>
        <div>Generated ${formatDateTime(new Date().toISOString())}</div>
      </div>
    </div>

    ${
      filterLabels.length > 0
        ? `<div class="filters">${filterLabels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}</div>`
        : ""
    }

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Title</th>
          <th>Type</th>
          <th>Method</th>
          <th>Notes</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="summary">
      <table>
        <thead>
          <tr><th>Summary by type</th><th class="num">Entries</th><th class="num">Amount</th></tr>
        </thead>
        <tbody>
          ${typeRowsHtml || '<tr><td colspan="3">No active expenses.</td></tr>'}
        </tbody>
      </table>
      <div class="total-box">
        <div class="total-label">Total expenses</div>
        <div class="total-value">${formatCurrency(grandTotal)}</div>
        <div class="total-note">${active.length} active ${active.length === 1 ? "entry" : "entries"}${
          voidedCount > 0 ? ` · ${voidedCount} voided (excluded)` : ""
        }</div>
      </div>
    </div>
  </body>
  </html>`;
}