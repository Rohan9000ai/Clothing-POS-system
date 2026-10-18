import { formatCurrency } from "@muzammil-pos/utils";
import type { StockProductRow } from "../../services/reports";

/** "—" with no stock, "Cost unknown" when no cost is known, else the value (marked when only partly known). */
export function stockCostText(row: Pick<StockProductRow, "pieces" | "costValue" | "unknownCostPieces">): string {
  if (row.pieces === 0) return "—";
  if (row.unknownCostPieces >= row.pieces) return "Cost unknown";
  return row.unknownCostPieces > 0 ? `${formatCurrency(row.costValue)} (partial)` : formatCurrency(row.costValue);
}