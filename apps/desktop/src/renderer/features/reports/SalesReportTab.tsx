import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import clsx from "clsx";
import { Button, Card, Table, type TableColumn } from "@muzammil-pos/ui";
import { formatCurrency } from "@muzammil-pos/utils";
import { reportsApi, type ProductSalesRow, type ReportQueryParams, type SalesReport } from "../../services/reports";
import { useToastStore } from "../../store/toastStore";
import { describeRange } from "../expenses/expenseRange";
import { salesChartSvg } from "./charts";
import { ShareBars } from "./components/ShareBars";
import { StatCard } from "./components/StatCard";
import { SvgChart } from "./components/SvgChart";
import { SALE_METHOD_LABELS, formatDayFull, plural } from "./reportFormat";
import { buildSalesReportHtml } from "./salesReportPdf";
import { useReportData } from "./useReportData";

type CashierRow = SalesReport["byCashier"][number];
type SalesmanRow = SalesReport["bySalesman"][number];
type RankedProduct = ProductSalesRow & { rank: number };

const CASHIER_COLUMNS: TableColumn<CashierRow>[] = [
  {
    header: "Cashier",
    render: (row) => (
      <div>
        <p className="font-medium text-gray-900">{row.name}</p>
        {row.username && <p className="text-xs text-gray-400">{row.username}</p>}
      </div>
    ),
  },
  { header: "Bills", className: "text-right", render: (row) => row.billCount },
  {
    header: "Net sales",
    className: "text-right",
    render: (row) => <span className="font-medium text-gray-900">{formatCurrency(row.netSales)}</span>,
  },
  { header: "Average", className: "text-right", render: (row) => formatCurrency(row.averageBill) },
  { header: "Share", className: "text-right", render: (row) => `${row.sharePercent}%` },
];

const SALESMAN_COLUMNS: TableColumn<SalesmanRow>[] = [
  { header: "Salesman", render: (row) => <span className="font-medium text-gray-900">{row.name}</span> },
  { header: "Bills", className: "text-right", render: (row) => row.billCount },
  {
    header: "Net sales",
    className: "text-right",
    render: (row) => <span className="font-medium text-gray-900">{formatCurrency(row.netSales)}</span>,
  },
  { header: "Average", className: "text-right", render: (row) => formatCurrency(row.averageBill) },
  { header: "Share", className: "text-right", render: (row) => `${row.sharePercent}%` },
];

const PRODUCT_COLUMNS: TableColumn<RankedProduct>[] = [
  { header: "#", render: (row) => <span className="text-gray-400">{row.rank}</span> },
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
  { header: "Pieces", className: "text-right", render: (row) => row.quantity },
  {
    header: "Revenue",
    className: "text-right",
    render: (row) => <span className="font-medium text-gray-900">{formatCurrency(row.revenue)}</span>,
  },
  { header: "Share", className: "text-right", render: (row) => `${row.sharePercent}%` },
];

interface SalesReportTabProps {
  query: ReportQueryParams | null;
  shopName: string;
}

export function SalesReportTab({ query, shopName }: SalesReportTabProps) {
  const push = useToastStore((s) => s.push);
  const { data, isLoading, error, reload } = useReportData(reportsApi.sales, query);
  const [productView, setProductView] = useState<"quantity" | "revenue">("quantity");
  const [isExporting, setIsExporting] = useState(false);

  const chart = useMemo(() => (data ? salesChartSvg(data) : null), [data]);

  const products = useMemo<RankedProduct[]>(() => {
    if (!data) return [];
    const rows = productView === "quantity" ? data.topProducts.byQuantity : data.topProducts.byRevenue;
    return rows.map((row, index) => ({ ...row, rank: index + 1 }));
  }, [data, productView]);

  async function handleExport() {
    if (!data) return;
    setIsExporting(true);
    try {
      const html = buildSalesReportHtml(data, shopName);
      const fileName = `muzammil-sales-report_${data.range.from}_to_${data.range.to}.pdf`;
      const result = await window.muzammilPOS.savePdf(html, fileName);
      if (result.success) push("success", "Sales report saved as PDF.");
      else if (!result.canceled) push("error", result.error ?? "Could not create the PDF. Please try again.");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Could not create the PDF. Please try again.");
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

  if (!data || !chart) {
    return <Card className="text-center text-sm text-gray-400">Loading the sales report…</Card>;
  }

  const { summary, previous, voided, highestSalesDay } = data;
  const compare = `vs ${describeRange({ from: previous.from, to: previous.to })}`;

  return (
    <div className={clsx("space-y-6 transition-opacity", isLoading && "opacity-60")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-section text-gray-900">Sales report</h3>
          <p className="text-xs text-gray-400">
            {describeRange({ from: data.range.from, to: data.range.to })} · {plural(summary.billCount, "bill")} ·
            completed sales only
          </p>
        </div>
        <Button variant="secondary" onClick={handleExport} isLoading={isExporting} disabled={isLoading}>
          <FileDown size={16} />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Net sales"
          value={formatCurrency(summary.netSales)}
          hint={`Before discounts ${formatCurrency(summary.grossSales)}`}
          change={previous.netSalesChangePercent}
          compareLabel={compare}
        />
        <StatCard
          label="Bills"
          value={String(summary.billCount)}
          hint={`${plural(summary.itemsSold, "piece")} sold`}
          change={previous.billCountChangePercent}
          compareLabel={compare}
        />
        <StatCard label="Average bill" value={formatCurrency(summary.averageBill)} hint="Net sales ÷ bills" />
        <StatCard
          label="Still to collect"
          value={formatCurrency(summary.outstanding)}
          hint={`Collected ${formatCurrency(summary.collected)}`}
        />
      </div>

      <Card>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">Discounts given</p>
            <p className="mt-0.5 font-medium text-gray-900">{formatCurrency(summary.discountTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Highest sales day</p>
            <p className="mt-0.5 font-medium text-gray-900">
              {highestSalesDay ? formatDayFull(highestSalesDay.date) : "—"}
            </p>
            {highestSalesDay && (
              <p className="text-xs text-gray-400">
                {formatCurrency(highestSalesDay.netSales)} · {plural(highestSalesDay.billCount, "bill")}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400">Bills by payment</p>
            <p className="mt-0.5 font-medium text-gray-900">{summary.paidBills} paid</p>
            <p className="text-xs text-gray-400">
              {summary.partialBills} partial · {summary.unpaidBills} unpaid
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Voided bills (excluded)</p>
            <p className="mt-0.5 font-medium text-gray-900">{voided.billCount}</p>
            {voided.billCount > 0 && <p className="text-xs text-gray-400">{formatCurrency(voided.amount)}</p>}
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Net sales by {chart.grain}</h4>
          <p className="text-xs text-gray-400">Darkest bar = best {chart.grain}. Hover a bar for details.</p>
        </div>
        <SvgChart svg={chart.svg} />
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h4 className="mb-4 text-sm font-semibold text-gray-900">Payment methods</h4>
          <ShareBars
            color="#4F46E5"
            rows={data.byPaymentMethod.map((row) => ({
              key: row.method,
              label: SALE_METHOD_LABELS[row.method],
              value: formatCurrency(row.amount),
              detail: `${plural(row.paymentCount, "payment")} · ${row.sharePercent}% of money collected`,
              percent: row.sharePercent,
            }))}
          />
        </Card>
        <Card>
          <h4 className="mb-4 text-sm font-semibold text-gray-900">Sales by cashier</h4>
          <Table
            columns={CASHIER_COLUMNS}
            data={data.byCashier}
            keyExtractor={(row) => row.cashierId}
            emptyMessage="No sales in this period."
          />
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h4 className="mb-4 text-sm font-semibold text-gray-900">Sales by salesman</h4>
          <Table
            columns={SALESMAN_COLUMNS}
            data={data.bySalesman}
            keyExtractor={(row) => row.salesmanId ?? "none"}
            emptyMessage="No sales in this period."
          />
        </Card>
        <Card>
          <h4 className="mb-4 text-sm font-semibold text-gray-900">Bills by payment status</h4>
          <ShareBars
            color="#16A34A"
            rows={[
              { key: "paid", label: "Fully paid", value: plural(summary.paidBills, "bill"), percent: summary.billCount ? (summary.paidBills / summary.billCount) * 100 : 0 },
              { key: "partial", label: "Partly paid", value: plural(summary.partialBills, "bill"), percent: summary.billCount ? (summary.partialBills / summary.billCount) * 100 : 0 },
              { key: "unpaid", label: "Unpaid (credit)", value: plural(summary.unpaidBills, "bill"), percent: summary.billCount ? (summary.unpaidBills / summary.billCount) * 100 : 0 },
            ]}
          />
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Top selling products</h4>
          <div className="inline-flex rounded-control border border-gray-200 bg-gray-50 p-0.5">
            {(["quantity", "revenue"] as const).map((view) => (
              <button
                key={view}
                onClick={() => setProductView(view)}
                className={clsx(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  productView === view ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {view === "quantity" ? "By pieces" : "By revenue"}
              </button>
            ))}
          </div>
        </div>
        <Table
          columns={PRODUCT_COLUMNS}
          data={products}
          keyExtractor={(row) => row.productId}
          emptyMessage="No products sold in this period."
        />
      </Card>

      <p className="text-xs text-gray-400">
        Voided bills are never included. Figures use the shop computer's clock for the start and end of each day.
      </p>
    </div>
  );
}