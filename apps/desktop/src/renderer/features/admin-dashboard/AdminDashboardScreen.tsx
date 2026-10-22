import { Link } from "react-router-dom";
import { Banknote, Boxes, Receipt, Wallet } from "lucide-react";
import { Badge, Button, Card, Table, type TableColumn } from "@muzammil-pos/ui";
import { formatCurrency, formatDateTime } from "@muzammil-pos/utils";
import type { DashboardLowStockItem, DashboardSale } from "../../services/dashboard";
import { salesmanCode } from "../../utils/salesmanCode";
import { SALE_METHOD_LABELS, formatDayFull, plural } from "../reports/reportFormat";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { KpiCard } from "./components/KpiCard";
import { RefreshControls } from "./components/RefreshControls";
import { SalesChartCard } from "./components/SalesChartCard";
import { timeLabel } from "./dashboardTime";
import { useDashboardData } from "./useDashboardData";

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
  const { data, error, refreshingSource, autoRefresh, setAutoRefresh, refresh } = useDashboardData();

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-title text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-400">
          {data ? formatDayFull(data.todayDate) : "Overview of today's shop activity"}
        </p>
      </div>
      <RefreshControls
        generatedAt={data?.generatedAt ?? null}
        autoRefresh={autoRefresh}
        onToggleAuto={setAutoRefresh}
        refreshingSource={refreshingSource}
        onRefresh={() => void refresh()}
      />
    </div>
  );

  if (!data) {
    return (
      <div className="space-y-6">
        {header}
        {error ? (
          <Card className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => void refresh()}>
              Try again
            </Button>
          </Card>
        ) : (
          <DashboardSkeleton />
        )}
      </div>
    );
  }

  const { today, yesterday, stock, recentSales, lowStock } = data;

  const expensesHint = [
    `Yesterday ${formatCurrency(yesterday.expensesTotal)}`,
    today.supplierPayments > 0 ? `incl. ${formatCurrency(today.supplierPayments)} to suppliers` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

  return (
    <div className="space-y-6">
      {header}

      {error && (
        <div className="rounded-card border border-warning/30 bg-warning-light px-4 py-2 text-sm text-warning">
          Couldn't refresh just now ({error}). Showing the numbers from {timeLabel(data.generatedAt)}.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="Today's Sales"
          value={formatCurrency(today.netSales)}
          hint={`Yesterday ${formatCurrency(yesterday.netSales)}`}
          icon={Banknote}
          to="/sales"
        />
        <KpiCard
          label="Today's Bills"
          value={String(today.billCount)}
          hint={`Yesterday ${yesterday.billCount}`}
          icon={Receipt}
          to="/sales"
        />
        <KpiCard
          label="Today's Expenses"
          value={formatCurrency(today.expensesTotal)}
          hint={expensesHint}
          icon={Wallet}
          to="/expenses"
        />
        <KpiCard
          label="Total Stock Items"
          value={String(stock.totalPieces)}
          hint={`${plural(stock.productCount, "product")} · ${plural(stock.variantCount, "size/color", "sizes/colors")}`}
          icon={Boxes}
          to="/inventory"
        />
      </div>

      <SalesChartCard data={data} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="min-w-0 xl:col-span-2">
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

        <section className="min-w-0">
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
        Voided bills and deleted expenses are never counted. Click a tile to open that page.
      </p>
    </div>
  );
}