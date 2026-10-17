import { formatDateTime } from "@muzammil-pos/utils";
import { escapeHtml } from "../../utils/receiptTemplates";

const PDF_CSS = `
  @page { size: A4; margin: 14mm 12mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 11px; line-height: 1.35; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; margin-bottom: 12px; }
  .shop { font-size: 18px; font-weight: 700; }
  .report-title { font-size: 13px; color: #4F46E5; font-weight: 600; margin-top: 2px; }
  .meta { text-align: right; color: #6b7280; line-height: 1.5; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px; }
  .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; }
  .kpi-label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; }
  .kpi-value { font-size: 15px; font-weight: 700; margin-top: 3px; }
  .kpi-note { font-size: 10px; margin-top: 3px; color: #6b7280; }
  .kpi-note.good { color: #16a34a; }
  .kpi-note.bad { color: #dc2626; }
  section { margin-top: 16px; }
  section.keep { page-break-inside: avoid; }
  h2 { font-size: 12px; margin: 0 0 6px; }
  .caption { color: #6b7280; font-size: 10px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { background: #4F46E5; color: #fff; font-size: 10px; text-transform: uppercase; text-align: left; padding: 5px 8px; }
  td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  tr { page-break-inside: avoid; }
  .num { text-align: right; white-space: nowrap; }
  .sub { color: #6b7280; font-size: 10px; margin-top: 1px; }
  .empty { color: #9ca3af; padding: 8px 0; }
  .bar-row { margin-bottom: 7px; page-break-inside: avoid; }
  .bar-top { display: flex; justify-content: space-between; }
  .bar-track { height: 7px; background: #f3f4f6; border-radius: 4px; margin-top: 3px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; }
  .tag { background: #fef3c7; color: #d97706; border-radius: 4px; padding: 0 5px; font-size: 9px; font-weight: 700; margin-left: 6px; }
  .note { margin-top: 14px; color: #6b7280; font-size: 10px; }
`;

/** `body` and every table cell are trusted HTML: callers escape any text that came from the database. */
export function pdfDocument(args: {
  title: string;
  shopName: string;
  rangeLabel: string;
  generatedAt: string;
  body: string;
}): string {
  return `<!doctype html>
  <html>
  <head><meta charset="utf-8"/><title>${escapeHtml(args.title)}</title><style>${PDF_CSS}</style></head>
  <body>
    <div class="header">
      <div>
        <div class="shop">${escapeHtml(args.shopName)}</div>
        <div class="report-title">${escapeHtml(args.title)}</div>
      </div>
      <div class="meta">
        <div>${escapeHtml(args.rangeLabel)}</div>
        <div>Generated ${formatDateTime(args.generatedAt)}</div>
      </div>
    </div>
    ${args.body}
  </body>
  </html>`;
}

export interface PdfKpi {
  label: string;
  value: string;
  note?: string;
  tone?: "good" | "bad" | "neutral";
}

export function pdfKpis(items: PdfKpi[]): string {
  const cells = items
    .map(
      (item) => `
      <div class="kpi">
        <div class="kpi-label">${escapeHtml(item.label)}</div>
        <div class="kpi-value">${escapeHtml(item.value)}</div>
        ${item.note ? `<div class="kpi-note ${item.tone ?? "neutral"}">${escapeHtml(item.note)}</div>` : ""}
      </div>`
    )
    .join("");
  return `<div class="kpis">${cells}</div>`;
}

export function pdfSection(title: string, inner: string, options: { keep?: boolean; caption?: string } = {}): string {
  return `<section class="${options.keep === false ? "" : "keep"}">
    <h2>${escapeHtml(title)}</h2>
    ${inner}
    ${options.caption ? `<div class="caption">${escapeHtml(options.caption)}</div>` : ""}
  </section>`;
}

export interface PdfColumn {
  label: string;
  align?: "right";
}

export function pdfTable(columns: PdfColumn[], rows: string[][], emptyText: string): string {
  if (rows.length === 0) return `<div class="empty">${escapeHtml(emptyText)}</div>`;
  const head = columns
    .map((column) => `<th${column.align === "right" ? ' class="num"' : ""}>${escapeHtml(column.label)}</th>`)
    .join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell, index) => `<td${columns[index]?.align === "right" ? ' class="num"' : ""}>${cell}</td>`)
          .join("")}</tr>`
    )
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export interface PdfBarRow {
  label: string;
  value: string;
  detail?: string;
  percent: number;
  tag?: string;
}

export function pdfBars(rows: PdfBarRow[], color: string): string {
  return rows
    .map(
      (row) => `
      <div class="bar-row">
        <div class="bar-top">
          <span>${escapeHtml(row.label)}${row.tag ? `<span class="tag">${escapeHtml(row.tag)}</span>` : ""}</span>
          <strong>${escapeHtml(row.value)}</strong>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.min(Math.max(row.percent, 0), 100)}%;background:${color}"></div></div>
        ${row.detail ? `<div class="sub">${escapeHtml(row.detail)}</div>` : ""}
      </div>`
    )
    .join("");
}