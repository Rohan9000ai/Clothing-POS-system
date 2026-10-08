import { formatCurrency, formatDateTime } from "@muzammil-pos/utils";
import type { Settings } from "@muzammil-pos/types";
import type { SaleDetail } from "../services/sales";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusLabel(status: SaleDetail["paymentStatus"]): string {
  return status === "PAID" ? "PAID" : status === "PARTIAL" ? "PARTIALLY PAID" : "UNPAID";
}

function methodLabel(method: string): string {
  return method.replace("_", " ");
}

/**
 * Full A4-style invoice — used for the on-screen preview and for printing
 * to a regular printer (or "Print to PDF").
 */
export function buildInvoiceHtml(sale: SaleDetail, settings: Settings): string {
  const items = sale.items ?? [];
  const payments = sale.payments ?? [];

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.productNameSnapshot)}</td>
        <td>${escapeHtml(item.sizeSnapshot)} / ${escapeHtml(item.colorSnapshot)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatCurrency(item.unitPrice)}</td>
        <td class="num">${formatCurrency(item.lineDiscount)}</td>
        <td class="num">${formatCurrency(item.lineTotal)}</td>
      </tr>`
    )
    .join("");

  const paymentLines = payments.length
    ? payments
        .map(
          (p) =>
            `${methodLabel(p.method)}${p.referenceNo ? ` (${escapeHtml(p.referenceNo)})` : ""}: ${formatCurrency(p.amount)}`
        )
        .join(" · ")
    : "No payment recorded";

  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice ${sale.billNo}</title>
    <style>
      @page { size: A4; margin: 18mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 13px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4F46E5; padding-bottom: 12px; margin-bottom: 16px; }
      .shop-name { font-size: 20px; font-weight: 700; color: #111827; }
      .tagline { font-size: 11px; color: #6b7280; margin-top: 2px; }
      .invoice-meta { text-align: right; }
      .status { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; background: ${sale.paymentStatus === "PAID" ? "#dcfce7" : sale.paymentStatus === "PARTIAL" ? "#fef3c7" : "#fee2e2"}; color: ${sale.paymentStatus === "PAID" ? "#16a34a" : sale.paymentStatus === "PARTIAL" ? "#d97706" : "#dc2626"}; }
      .bill-no { font-size: 16px; font-weight: 700; margin-top: 4px; }
      .info-grid { display: flex; justify-content: space-between; background: #f9fafb; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px; }
      .info-grid div { line-height: 1.6; }
      .info-label { color: #6b7280; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      thead th { background: #4F46E5; color: #fff; font-size: 11px; text-transform: uppercase; text-align: left; padding: 8px; }
      tbody td { padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
      .num { text-align: right; }
      .totals { width: 260px; margin-left: auto; font-size: 13px; }
      .totals div { display: flex; justify-content: space-between; padding: 3px 0; }
      .totals .grand { font-size: 16px; font-weight: 700; border-top: 2px solid #111827; padding-top: 6px; margin-top: 4px; }
      .payments { margin-top: 10px; font-size: 11px; color: #6b7280; }
      .footer { margin-top: 24px; padding-top: 12px; border-top: 1px dashed #d1d5db; font-size: 11px; color: #6b7280; text-align: center; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="shop-name">${escapeHtml(settings.shopName)}</div>
        ${settings.receiptHeader ? `<div class="tagline">${escapeHtml(settings.receiptHeader)}</div>` : ""}
      </div>
      <div class="invoice-meta">
        <span class="status">${statusLabel(sale.paymentStatus)}</span>
        <div class="bill-no">#${escapeHtml(sale.billNo)}</div>
      </div>
    </div>

    <div class="info-grid">
      <div>
        <div class="info-label">Bill to</div>
        <div><strong>${escapeHtml(sale.customer.name)}</strong></div>
      </div>
      <div>
        <div><span class="info-label">Date:</span> ${formatDateTime(sale.saleDate)}</div>
        <div><span class="info-label">Cashier:</span> ${escapeHtml(sale.cashier.fullName)}</div>
        <div><span class="info-label">Salesman:</span> ${sale.salesman ? escapeHtml(sale.salesman.name) : "—"}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Size / Color</th>
          <th class="num">Qty</th>
          <th class="num">Unit Price</th>
          <th class="num">Discount</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="totals">
      <div><span>Subtotal</span><span>${formatCurrency(sale.subTotal)}</span></div>
      <div><span>Discount</span><span>−${formatCurrency(sale.discountTotal)}</span></div>
      <div class="grand"><span>Grand total</span><span>${formatCurrency(sale.netTotal)}</span></div>
    </div>

    <div class="payments">Payment: ${paymentLines}</div>

    <div class="footer">
      ${settings.receiptFooter ? escapeHtml(settings.receiptFooter) : "Thank you for shopping with us."}
    </div>
  </body>
  </html>`;
}

/**
 * Narrow 80mm thermal receipt — used for the "Print Thermal Receipt" action.
 */
export function buildThermalReceiptHtml(sale: SaleDetail, settings: Settings): string {
  const items = sale.items ?? [];
  const payments = sale.payments ?? [];

  const itemLines = items
    .map(
      (item) => `
      <div class="item">
        <div class="item-name">${escapeHtml(item.productNameSnapshot)}</div>
        <div class="item-sub">${escapeHtml(item.sizeSnapshot)} / ${escapeHtml(item.colorSnapshot)}</div>
        <div class="item-row">
          <span>${item.quantity} × ${formatCurrency(item.unitPrice)}</span>
          <span>${formatCurrency(item.lineTotal)}</span>
        </div>
      </div>`
    )
    .join("");

  const paymentLines = payments.length
    ? payments
        .map(
          (p) => `<div class="row"><span>${methodLabel(p.method)}</span><span>${formatCurrency(p.amount)}</span></div>`
        )
        .join("")
    : `<div class="row"><span>Unpaid</span><span>${formatCurrency(0)}</span></div>`;

  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Receipt ${sale.billNo}</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      * { box-sizing: border-box; }
      body { width: 72mm; margin: 0 auto; padding: 6mm 4mm; font-family: "Courier New", monospace; font-size: 11px; color: #000; }
      .center { text-align: center; }
      .shop-name { font-size: 15px; font-weight: 700; }
      .tagline, .meta { font-size: 10px; color: #333; margin-top: 2px; }
      .divider { border-top: 1px dashed #000; margin: 6px 0; }
      .item { margin-bottom: 4px; }
      .item-name { font-weight: 700; }
      .item-sub { font-size: 10px; color: #333; }
      .item-row, .row { display: flex; justify-content: space-between; }
      .totals .row.grand { font-weight: 700; font-size: 13px; border-top: 1px solid #000; padding-top: 3px; margin-top: 3px; }
      .footer { margin-top: 10px; font-size: 10px; }
    </style>
  </head>
  <body>
    <div class="center">
      <div class="shop-name">${escapeHtml(settings.shopName)}</div>
      ${settings.receiptHeader ? `<div class="tagline">${escapeHtml(settings.receiptHeader)}</div>` : ""}
      <div class="meta">Bill #${escapeHtml(sale.billNo)} · ${formatDateTime(sale.saleDate)}</div>
    </div>

    <div class="divider"></div>

    ${itemLines}

    <div class="divider"></div>

    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${formatCurrency(sale.subTotal)}</span></div>
      <div class="row"><span>Discount</span><span>−${formatCurrency(sale.discountTotal)}</span></div>
      <div class="row grand"><span>TOTAL</span><span>${formatCurrency(sale.netTotal)}</span></div>
    </div>

    <div class="divider"></div>

    ${paymentLines}

    <div class="divider"></div>

    <div class="center footer">
      ${settings.receiptFooter ? escapeHtml(settings.receiptFooter) : "Thank you for shopping with us."}
    </div>
  </body>
  </html>`;
}