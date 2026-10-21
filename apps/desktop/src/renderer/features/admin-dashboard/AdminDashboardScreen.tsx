import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Banknote, Boxes, Receipt, RefreshCw, Wallet } from "lucide-react";
import { Badge, Button, Card, Table, type TableColumn } from "@muzammil-pos/ui";
import { formatCurrency, formatDateTime } from "@muzammil-pos/utils";
import type { DashboardData, DashboardLowStockItem, DashboardSale } from "../../services/dashboard";
import { salesmanCode } from "../../utils/salesmanCode";
import { barChartSvg } from "../reports/charts";
import { SvgChart } from "../reports/components/SvgChart";
import { SALE_METHOD_LABELS, formatCompactMoney, formatDayFull, plural } from "../reports/reportFormat";
import { KpiCard } from "./components/KpiCard";
import { useDashboardData } from "./useDashboardData";

const weekdayFormatter = new Intl.DateTimeFormat("en-PK", { weekday: "short", timeZone: "UTC" });

function weekdayLabel(ymd: string): string {
  return weekdayFormatter.format(new Date(`${ymd}T00:00:00.000Z`));
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function buildChartSvg(data: DashboardData): string {
  const days = data.salesLast7Days.daily;
  const points = days.map((day, index) => ({
    label: index === days.length - 1 ? "Today" : weekdayLabel(day.date),
    tooltip: `${formatDayFull(day.date)} — ${formatCurrency(day.netSales)} · ${plural(day.billCount, "bill")}`,
    value: day.netSales,
  }));

  return barChartSvg({
    points,
    color: "#4F46E5",
    highlightColor: "#3730A3",
    formatAxis: formatCompactMoney,
    emptyText: "No sales in the last 7 days",
    ariaLabel: "Net sales for the last 7 days",
    height: 230,
  });
}

const RECENT_SALES_COLUMNS: TableColumn<DashboardSale>[] = [
  {
    header: "Bill No",
    render: (row) => (
      <div>
        <Link to={`/invoice/${row.saleId}`} className="font-medium text-brand hover:underline">
          {row.billNo}
        </Link>
        <p className="text-xs text-gray-400">{formatDateTime(row.saleDate)}</p>
      </div>
    ),
  },
  { header: "Customer", render: (row) => <span className="text-gray-700">{row.customerName}</span> },
  {
    header: "Payment",
    render: (row) => (
      <div className="flex flex-wrap items-center gap-1">
        {row.paymentMethods.length === 0 ? (
          <Badge tone="danger">Unpaid</Badge>
        ) : (
          row.paymentMethods.map((method) => (
            <Badge key={method} tone="neutral">
              {SALE_METHOD_LABELS[method]}
            </Badge>
          ))
        )}
        {row.paymentStatus === "PARTIAL" && <Badge tone="warning">Partial</Badge>}
      </div>
    ),
  },
  {
    header: "Salesman ID",
    render: (row) =>
      row.salesman ? (
        <div>
          <p className="text-gray-900">{row.salesman.name}</p>
          <p className="font-mono text-xs text-gray-400">{salesmanCode(row.salesman.id)}</p>
        </div>
      ) : (
        <span className="text-gray-300">—</span>
      ),
  },
  {
    header: "Amount",
    className: "text-right",
    render: (row) => <span className="font-medium text-gray-900">{formatCurrency(row.netTotal)}</span>,
  },
];

const LOW_STOCK_COLUMNS: TableColumn<DashboardLowStockItem>[] = [
  {
    header: "Product",
    render: (row) => (
      <div>
        <p className="font-medium text-gray-900">{row.productName}</p>
        <p className="text-xs text-gray-400">
          {row.size} / {row.color}
        </p>
      </div>
    ),
  },
  {
    header: "Left",
    className: "text-right",
    render: (row) =>
      row.quantity === 0 ? <Badge tone="danger">Out of stock</Badge> : <Badge tone="warning">{row.quantity} left</Badge>,
  },
];

export function AdminDashboardScreen() {
  const { data, error, isRefreshing, refresh } = useDashboardData();
  const chartSvg = useMemo(() => (data ? buildChartSvg(data) : null), [data]);

  if (!data || !chartSvg) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-title text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-400">Overview of today's shop activity</p>
        </div>
        {error ? (
          <Card className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => void refresh()}>
              Try again
            </Button>
          </Card>
        ) : (
          <Card className="text-center text-sm text-gray-400">Loading the dashboard…</Card>
        )}
      </div>
    );
  }

  const { today, yesterday, stock, salesLast7Days, recentSales, lowStock } = data;

  const expensesHint = [
    `Yesterday ${formatCurrency(yesterday.expensesTotal)}`,
    today.supplierPayments > 0 ? `incl. ${formatCurrency(today.supplierPayments)} to suppliers` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-title text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-400">
            {formatDayFull(data.todayDate)} · updated {timeLabel(data.generatedAt)}
          </p>
        </div>
        <Button variant="secondary" onClick={() => void refresh()} isLoading={isRefreshing}>
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-card border border-warning/30 bg-warning-light px-4 py-2 text-sm text-warning">
          Couldn't refresh just now ({error}). Showing the numbers from {timeLabel(data.generatedAt)}.
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Today's Sales"
          value={formatCurrency(today.netSales)}
          hint={`Yesterday ${formatCurrency(yesterday.netSales)}`}
          icon={Banknote}
        />
        <KpiCard
          label="Today's Bills"
          value={String(today.billCount)}
          hint={`Yesterday ${yesterday.billCount}`}
          icon={Receipt}
        />
        <KpiCard
          label="Today's Expenses"
          value={formatCurrency(today.expensesTotal)}
          hint={expensesHint}
          icon={Wallet}
        />
        <KpiCard
          label="Total Stock Items"
          value={String(stock.totalPieces)}
          hint={`${plural(stock.productCount, "product")} · ${plural(stock.variantCount, "size/color", "sizes/colors")}`}
          icon={Boxes}
        />
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-section text-gray-900">7-Day Sales Activity</h3>
            <p className="text-xs text-gray-400">Net sales per day. Darkest bar = best day. Hover a bar for details.</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(salesLast7Days.total.netSales)}</p>
            <p className="text-xs text-gray-400">{plural(salesLast7Days.total.billCount, "bill")} in 7 days</p>
          </div>
        </div>
        <SvgChart svg={chartSvg} />
      </Card>

      <div className="grid grid-cols-3 gap-6">
        <section className="col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-section text-gray-900">Recent Sales (last 7 days)</h3>
            <Link to="/sales" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          </div>
          <Table
            columns={RECENT_SALES_COLUMNS}
            data={recentSales}
            keyExtractor={(row) => row.saleId}
            emptyMessage="No sales in the last 7 days."
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-section text-gray-900">Low Stock</h3>
              <Badge tone="warning">Below {lowStock.threshold}</Badge>
            </div>
            <Link to="/inventory" className="text-sm font-medium text-brand hover:underline">
              Manage
            </Link>
          </div>
          {lowStock.total > 0 && (
            <p className="mb-2 text-xs text-gray-400">
              {plural(lowStock.total, "size/color", "sizes/colors")} running low · {lowStock.outOfStock} out of stock
            </p>
          )}
          <Table
            columns={LOW_STOCK_COLUMNS}
            data={lowStock.items}
            keyExtractor={(row) => row.variantId}
            emptyMessage="All products are well stocked."
          />
          {lowStock.total > lowStock.items.length && (
            <p className="mt-2 text-xs text-gray-400">
              Showing {lowStock.items.length} of {lowStock.total}. The full list is in{" "}
              <Link to="/reports" className="font-medium text-brand hover:underline">
                Reports → Stock
              </Link>
              .
            </p>
          )}
        </section>
      </div>

      <p className="text-xs text-gray-400">
        Voided bills and deleted expenses are never counted. Updates itself every minute.
      </p>
    </div>
  );
}