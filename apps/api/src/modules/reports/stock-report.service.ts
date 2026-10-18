import { prisma } from "../../database/prisma";
import { Errors } from "../../common/errors";
import type { StockReportQuery } from "@muzammil-pos/validation";
import { getSettings } from "../settings/settings.service";
import { loadCostLookup } from "./cost-lookup";
import { percentOf } from "./report-math";

interface ProductTotals {
  productId: string;
  name: string;
  productCode: string;
  categoryId: string;
  categoryName: string;
  status: string;
  variantCount: number;
  pieces: number;
  costValue: number;
  retailValue: number;
  unknownCostPieces: number;
  unknownCostRetail: number;
  lowStockCount: number;
  outOfStockCount: number;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function getStockReport(query: StockReportQuery) {
  let categoryFilter: { id: string; name: string } | null = null;
  if (query.categoryId) {
    categoryFilter = await prisma.category.findUnique({
      where: { id: query.categoryId },
      select: { id: true, name: true },
    });
    if (!categoryFilter) throw Errors.notFound("Category", query.categoryId);
  }

  const settings = await getSettings();
  const threshold = settings.lowStockThreshold;

  const variants = await prisma.productVariant.findMany({
    where: query.categoryId ? { product: { categoryId: query.categoryId } } : {},
    select: {
      id: true,
      size: true,
      color: true,
      quantity: true,
      status: true,
      priceOverride: true,
      product: {
        select: {
          id: true,
          name: true,
          productCode: true,
          basePrice: true,
          status: true,
          categoryId: true,
          category: { select: { name: true } },
        },
      },
    },
  });

  const costs = await loadCostLookup([...new Set(variants.map((v) => v.product.id))]);

  const products = new Map<string, ProductTotals>();
  const lowStock: {
    variantId: string;
    productId: string;
    productName: string;
    productCode: string;
    size: string;
    color: string;
    quantity: number;
    isOut: boolean;
  }[] = [];

  let totalPieces = 0;
  let costValue = 0;
  let retailValue = 0;
  let retailWithKnownCost = 0;
  let piecesWithUnknownCost = 0;
  let inactivePieces = 0;
  let inactiveValueAtCost = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const variant of variants) {
    const product = variant.product;
    // Only active products and active sizes/colors can be sold, so only they raise alerts.
    const sellable = variant.status === "ACTIVE" && product.status === "ACTIVE";
    const unitRetail = variant.priceOverride ?? product.basePrice;
    const cost = costs.unitCost(product.id, variant.id);
    const variantRetail = variant.quantity * unitRetail;
    const variantCost = cost ? variant.quantity * cost.value : 0;

    let totals = products.get(product.id);
    if (!totals) {
      totals = {
        productId: product.id,
        name: product.name,
        productCode: product.productCode,
        categoryId: product.categoryId,
        categoryName: product.category.name,
        status: product.status,
        variantCount: 0,
        pieces: 0,
        costValue: 0,
        retailValue: 0,
        unknownCostPieces: 0,
        unknownCostRetail: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      };
      products.set(product.id, totals);
    }

    totals.variantCount += 1;
    totals.pieces += variant.quantity;
    totals.retailValue += variantRetail;
    totals.costValue += variantCost;

    totalPieces += variant.quantity;
    retailValue += variantRetail;
    costValue += variantCost;

    if (cost) {
      retailWithKnownCost += variantRetail;
    } else {
      piecesWithUnknownCost += variant.quantity;
      totals.unknownCostPieces += variant.quantity;
      totals.unknownCostRetail += variantRetail;
    }

    if (!sellable) {
      inactivePieces += variant.quantity;
      inactiveValueAtCost += variantCost;
    }

    if (sellable && variant.quantity < threshold) {
      const isOut = variant.quantity === 0;
      if (isOut) {
        outOfStockCount += 1;
        totals.outOfStockCount += 1;
      } else {
        lowStockCount += 1;
        totals.lowStockCount += 1;
      }
      lowStock.push({
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        productCode: product.productCode,
        size: variant.size,
        color: variant.color,
        quantity: variant.quantity,
        isOut,
      });
    }
  }

  lowStock.sort((a, b) => a.quantity - b.quantity || a.productName.localeCompare(b.productName));

  // ---- By category ----
  const categories = new Map<
    string,
    { name: string; productCount: number; pieces: number; costValue: number; retailValue: number }
  >();
  for (const totals of products.values()) {
    const entry = categories.get(totals.categoryId) ?? {
      name: totals.categoryName,
      productCount: 0,
      pieces: 0,
      costValue: 0,
      retailValue: 0,
    };
    entry.productCount += 1;
    entry.pieces += totals.pieces;
    entry.costValue += totals.costValue;
    entry.retailValue += totals.retailValue;
    categories.set(totals.categoryId, entry);
  }

  const byCategory = [...categories.entries()]
    .map(([categoryId, entry]) => ({
      categoryId,
      name: entry.name,
      productCount: entry.productCount,
      pieces: entry.pieces,
      costValue: entry.costValue,
      retailValue: entry.retailValue,
      sharePercent: percentOf(entry.retailValue, retailValue),
    }))
    .sort((a, b) => b.retailValue - a.retailValue || a.name.localeCompare(b.name));

  // ---- By product ----
  const productRows = [...products.values()]
    .map((p) => ({
      productId: p.productId,
      name: p.name,
      productCode: p.productCode,
      categoryName: p.categoryName,
      status: p.status,
      variantCount: p.variantCount,
      pieces: p.pieces,
      costValue: p.costValue,
      retailValue: p.retailValue,
      unknownCostPieces: p.unknownCostPieces,
      lowStockCount: p.lowStockCount,
      outOfStockCount: p.outOfStockCount,
    }))
    .sort((a, b) => b.retailValue - a.retailValue || a.name.localeCompare(b.name));

  // ---- Products holding stock that has no known cost ----
  const costGaps = [...products.values()]
    .filter((p) => p.unknownCostPieces > 0)
    .sort((a, b) => b.unknownCostRetail - a.unknownCostRetail)
    .slice(0, query.topN)
    .map((p) => ({
      productId: p.productId,
      name: p.name,
      pieces: p.unknownCostPieces,
      retailValue: p.unknownCostRetail,
    }));

  return {
    categoryFilter,
    summary: {
      productCount: products.size,
      variantCount: variants.length,
      totalPieces,
      inventoryValueAtCost: costValue,
      inventoryValueAtRetail: retailValue,
      /** Selling price minus cost, only over pieces whose cost is known. */
      potentialProfit: retailWithKnownCost - costValue,
      costCoveragePercent: totalPieces > 0 ? round1(((totalPieces - piecesWithUnknownCost) / totalPieces) * 100) : 100,
      piecesWithUnknownCost,
      lowStockThreshold: threshold,
      lowStockCount,
      outOfStockCount,
      inactivePieces,
      inactiveValueAtCost,
    },
    lowStock,
    byCategory,
    products: productRows,
    costGaps,
    generatedAt: new Date().toISOString(),
  };
}