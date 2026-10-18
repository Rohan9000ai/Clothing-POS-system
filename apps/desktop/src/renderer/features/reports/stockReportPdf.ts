import { formatCurrency } from "@muzammil-pos/utils";
import type { StockReport } from "../../services/reports";
import { escapeHtml } from "../../utils/receiptTemplates";
import { pdfBars, pdfDocument, pdfKpis, pdfSection, pdfTable } from "./pdfKit";
import { plural } from "./reportFormat";
import { stockCostText } from "./stockFormat";

export function buildStockReportHtml(report: StockReport, shopName: string): string {
  const { summary } = report;

  const kpis = pdfKpis([
    {
      label: "Pieces in stock",
      value: String(summary.totalPieces),
      note: `${plural(summary.variantCount, "size/color", "sizes/colors")} in ${plural(summary.productCount, "product")}`,
    },
    {
      label: "Value at cost",
      value: formatCurrency(summary.inventoryValueAtCost),
      note: summary.costCoveragePercent < 100 ? `Cost known for ${summary.costCoveragePercent}% of pieces` : "Cost known for all pieces",
      tone: summary.costCoveragePercent < 100 ? "bad" : "neutral",
    },
    { label: "Value at selling price", value: formatCurrency(summary.inventoryValueAtRetail) },
    { label: "Potential profit", value: formatCurrency(summary.potentialProfit), note: "Selling price minus cost" },
  ]);

  const alerts = pdfKpis([
    { label: `Low stock (below ${summary.lowStockThreshold})`, value: String(summary.lowStockCount) },
    { label: "Out of stock", value: String(summary.outOfStockCount) },
    {
      label: "Stock in inactive items",
      value: String(summary.inactivePieces),
      note: `${formatCurrency(summary.inactiveValueAtCost)} at cost`,
    },
    {
      label: "Pieces with no known cost",
      value: String(summary.piecesWithUnknownCost),
      tone: summary.piecesWithUnknownCost > 0 ? "bad" : "neutral",
    },
  ]);

  const lowStock = pdfTable(
    [
      { label: "Product" },
      { label: "Size / color" },
      { label: "Left", align: "right" },
      { label: "Status" },
    ],
    report.lowStock.map((row) => [
      `<strong>${escapeHtml(row.productName)}</strong><div class="sub">${escapeHtml(row.productCode)}</div>`,
      `${escapeHtml(row.size)} / ${escapeHtml(row.color)}`,
      String(row.quantity),
      row.isOut ? "Out of stock" : "Low",
    ]),
    "Nothing is running low."
  );

  const categories = pdfBars(
    report.byCategory.map((row) => ({
      label: row.name,
      value: formatCurrency(row.retailValue),
      detail: `${plural(row.pieces, "piece")} in ${plural(row.productCount, "product")} · cost value ${formatCurrency(row.costValue)}`,
      percent: row.sharePercent,
    })),
    "#4F46E5"
  );

  const products = pdfTable(
    [
      { label: "Product" },
      { label: "Category" },
      { label: "Pieces", align: "right" },
      { label: "Value at cost", align: "right" },
      { label: "Value at selling price", align: "right" },
    ],
    report.products.map((row) => [
      `<strong>${escapeHtml(row.name)}</strong><div class="sub">${escapeHtml(row.productCode)}${
        row.status === "INACTIVE" ? " · inactive" : ""
      }</div>`,
      escapeHtml(row.categoryName ?? "—"),
      String(row.pieces),
      stockCostText(row),
      formatCurrency(row.retailValue),
    ]),
    "No products."
  );

  const gaps =
    report.costGaps.length > 0
      ? pdfSection(
          "Products with stock but no known cost",
          pdfTable(
            [{ label: "Product" }, { label: "Pieces", align: "right" }, { label: "Value at selling price", align: "right" }],
            report.costGaps.map((gap) => [escapeHtml(gap.name), String(gap.pieces), formatCurrency(gap.retailValue)]),
            ""
          ),
          { caption: "Add a cost price in Inventory, or record the supplier's bill, to include these in the cost value." }
        )
      : "";

  const body = `
    ${kpis}
    ${alerts}
    ${gaps}
    ${pdfSection("Low stock and out of stock", lowStock, { keep: false })}
    ${pdfSection("Stock value by category (at selling price)", categories)}
    ${pdfSection("All products", products, { keep: false })}
  `;

  return pdfDocument({
    title: "Stock report",
    shopName,
    rangeLabel: report.categoryFilter ? `Category: ${report.categoryFilter.name}` : "All categories · stock right now",
    generatedAt: report.generatedAt,
    body,
  });
}