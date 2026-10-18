import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import clsx from "clsx";
import { Badge, Button, Card, Select, Table, type TableColumn } from "@muzammil-pos/ui";
import { formatCurrency, formatDateTime } from "@muzammil-pos/utils";
import type { Category } from "@muzammil-pos/types";
import { categoriesApi } from "../../services/inventory";
import { reportsApi, type StockProductRow, type StockQueryParams, type StockReport } from "../../services/reports";
import { buildStockReportHtml } from "./stockReportPdf";
import { Pager } from "./components/Pager";
import { ReportHeader } from "./components/ReportHeader";
import { ShareBars } from "./components/ShareBars";
import { StatCard } from "./components/StatCard";
import { plural } from "./reportFormat";
import { saveReportPdf } from "./saveReportPdf";
import { stockCostText } from "./stockFormat";
import { useReportData } from "./useReportData";

type LowStockRow = StockReport["lowStock"][number];

const PAGE_SIZE = 15;
const LOW_ROWS_SHOWN = 10;

const LOW_STOCK_COLUMNS: TableColumn<LowStockRow>[] = [
  {
    header: "Product",
    render: (row) => (
      <div>
        <p className="font-medium text-gray-900">{row.productName}</p>
        <p className="text-xs text-gray-400">{row.productCode}</p>
      </div>
    ),
  },
  { header: "Size / color", render: (row) => `${row.size} / ${row.color}` },
  { header: "Left", className: "text-right", render: (row) => row.quantity },
  {
    header: "Status",
    render: (row) => (row.isOut ? <Badge tone="danger">Out of stock</Badge> : <Badge tone="warning">Low stock</Badge>),
  },
];

const PRODUCT_COLUMNS: TableColumn<StockProductRow>[] = [
  {
    header: "Product",
    render: (row) => (
      <div>
        <p className="font-medium text-gray-900">{row.name}</p>
        <p className="text-xs text-gray-400">{row.productCode}</p>
      </div>
    ),
  },
  { header: "Category", render: (row) => <span className="text-gray-600">{row.categoryName ?? "—"}</span> },
  { header: "Sizes/colors", className: "text-right", render: (row) => row.variantCount },
  {
    header: "Pieces",
    className: "text-right",
    render: (row) => (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <span className="font-medium text-gray-900">{row.pieces}</span>
        {row.outOfStockCount > 0 && <Badge tone="danger">{row.outOfStockCount} out</Badge>}
        {row.lowStockCount > 0 && <Badge tone="warning">{row.lowStockCount} low</Badge>}
        {row.status === "INACTIVE" && <Badge tone="neutral">Inactive</Badge>}
      </div>
    ),
  },
  {
    header: "Value at cost",
    className: "text-right",
    render: (row) => (
      <span className={row.unknownCostPieces > 0 && row.pieces > 0 ? "text-warning" : "text-gray-700"}>
        {stockCostText(row)}
      </span>
    ),
  },
  {
    header: "Value at selling price",
    className: "text-right",
    render: (row) => <span className="font-medium text-gray-900">{formatCurrency(row.retailValue)}</span>,
  },
];

export function StockReportTab({ shopName }: { shopName: string }) {
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAllLow, setShowAllLow] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const query = useMemo<StockQueryParams>(
    () => ({ categoryId: categoryId || undefined, topN: 10 }),
    [categoryId]
  );
  const { data, isLoading, error, reload } = useReportData(reportsApi.stock, query);

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => {
      // The category filter just stays empty; the report still works.
    });
  }, []);

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.products;
    return data.products.filter(
      (row) => row.name.toLowerCase().includes(q) || row.productCode.toLowerCase().includes(q)
    );
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function handleExport() {
    if (!data) return;
    setIsExporting(true);
    try {
      await saveReportPdf(
        () => buildStockReportHtml(data, shopName),
        `muzammil-stock-report_${new Date().toISOString().slice(0, 10)}.pdf`,
        "Stock report saved as PDF."
      );
    } finally {
      setIsExporting(false);
    }
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-danger">{error}</p>
        <Button variant="secondary" size="sm" onClick={reload}>
          Try again
        </Button>
      </Card>
    );
  }

  if (!data) {
    return <Card className="text-center text-sm text-gray-400">Loading the stock report…</Card>;
  }

  const { summary } = data;
  const lowRows = showAllLow ? data.lowStock : data.lowStock.slice(0, LOW_ROWS_SHOWN);

  return (
    <div className={clsx("space-y-6 transition-opacity", isLoading && "opacity-60")}>
      <ReportHeader
        title="Stock report"
        subtitle={`${data.categoryFilter ? `Category: ${data.categoryFilter.name}` : "All categories"} · as of ${formatDateTime(
          data.generatedAt
        )}`}
        onExport={handleExport}
        isExporting={isExporting}
        onRefresh={reload}
        disabled={isLoading}
      />

      <div className="flex items-center gap-3">
        <Select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          options={[{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          className="w-52"
        />
      </div>

      {summary.costCoveragePercent < 100 && (
        <div className="rounded-card border border-warning/30 bg-warning-light px-4 py-3 text-sm text-warning">
          <p className="font-medium">The cost value is incomplete: cost is known for {summary.costCoveragePercent}% of the pieces.</p>
          <p className="mt-0.5 text-xs">
            {plural(summary.piecesWithUnknownCost, "piece")} have no known cost and are not in "Value at cost". Add a cost
            price in Inventory, or record the supplier's bill.
            {data.costGaps.length > 0 &&
              ` Missing a cost: ${data.costGaps.map((gap) => `${gap.name} (${plural(gap.pieces, "piece")})`).join(", ")}.`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Pieces in stock"
          value={String(summary.totalPieces)}
          hint={`${plural(summary.variantCount, "size/color", "sizes/colors")} in ${plural(summary.productCount, "product")}`}
        />
        <StatCard
          label="Value at cost"
          value={formatCurrency(summary.inventoryValueAtCost)}
          hint="What the stock cost you"
        />
        <StatCard
          label="Value at selling price"
          value={formatCurrency(summary.inventoryValueAtRetail)}
          hint="What it would sell for"
        />
        <StatCard
          label="Potential profit"
          value={formatCurrency(summary.potentialProfit)}
          valueTone={summary.potentialProfit < 0 ? "bad" : undefined}
          hint="Selling price minus cost"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label={`Low stock (below ${summary.lowStockThreshold})`}
          value={String(summary.lowStockCount)}
          hint="Sizes/colors running low"
        />
        <StatCard label="Out of stock" value={String(summary.outOfStockCount)} hint="Sizes/colors at zero" />
        <StatCard
          label="Stock in inactive items"
          value={String(summary.inactivePieces)}
          hint={`${formatCurrency(summary.inactiveValueAtCost)} at cost, included above`}
        />
      </div>

      <div className="grid grid-cols-5 gap-6">
        <Card className="col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Low stock and out of stock</h4>
            <span className="text-xs text-gray-400">{plural(data.lowStock.length, "item")}</span>
          </div>
          <Table
            columns={LOW_STOCK_COLUMNS}
            data={lowRows}
            keyExtractor={(row) => row.variantId}
            emptyMessage="Nothing is running low."
          />
          {data.lowStock.length > LOW_ROWS_SHOWN && (
            <button
              onClick={() => setShowAllLow((value) => !value)}
              className="mt-3 text-sm font-medium text-brand hover:underline"
            >
              {showAllLow ? "Show fewer" : `Show all ${data.lowStock.length}`}
            </button>
          )}
        </Card>

        <Card className="col-span-2">
          <h4 className="mb-1 text-sm font-semibold text-gray-900">Stock value by category</h4>
          <p className="mb-4 text-xs text-gray-400">At selling price</p>
          {data.byCategory.length === 0 ? (
            <p className="text-sm text-gray-400">No stock.</p>
          ) : (
            <ShareBars
              color="#4F46E5"
              rows={data.byCategory.map((row) => ({
                key: row.categoryId,
                label: row.name,
                value: formatCurrency(row.retailValue),
                detail: `${plural(row.pieces, "piece")} in ${plural(row.productCount, "product")} · cost value ${formatCurrency(row.costValue)}`,
                percent: row.sharePercent,
              }))}
            />
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h4 className="text-sm font-semibold text-gray-900">All products</h4>
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or code…"
              className="w-full rounded-control border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </div>
        <Table
          columns={PRODUCT_COLUMNS}
          data={pageRows}
          keyExtractor={(row) => row.productId}
          emptyMessage={search ? "No products match your search." : "No products yet."}
        />
        <Pager page={safePage} totalPages={totalPages} totalItems={filteredProducts.length} onPage={setPage} />
      </Card>

      <p className="text-xs text-gray-400">
        Stock is counted right now, so it changes with every sale and delivery. Value at cost uses the product's cost price,
        then the newest supplier bill.
      </p>
    </div>
  );
}