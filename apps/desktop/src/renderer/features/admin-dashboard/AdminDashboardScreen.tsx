import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Banknote, Boxes, Receipt, Wallet } from "lucide-react";
import { Badge, Card, Table, type TableColumn } from "@muzammil-pos/ui";
import { formatCurrency } from "@muzammil-pos/utils";
import { KpiCard } from "./components/KpiCard";
import { SalesBarChart, type BarDatum } from "./components/SalesBarChart";

// Will come from the settings table once the Settings module is built.
const LOW_STOCK_THRESHOLD = 5;

interface RecentSaleRow {
  id: string;
  billNo: string;
  customer: string;
  paymentMethod: string;
  salesmanId: string | null;
  amount: number; // paisa
}

interface LowStockRow {
  id: string;
  productName: string;
  variantLabel: string; // e.g. "M / Navy"
  quantity: number;
}

function buildLast7Days(): BarDatum[] {
  const days: BarDatum[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }), value: 0 });
  }
  return days;
}

const KPIS = [
  { label: "Today's Sales", value: "—", hint: "Updates once sales are recorded", icon: Banknote },
  { label: "Today's Bills", value: "—", hint: "Updates once sales are recorded", icon: Receipt },
  { label: "Today's Expenses", value: "—", hint: "Updates once expenses are recorded", icon: Wallet },
  { label: "Total Stock Items", value: "—", hint: "Updates once products are added", icon: Boxes },
];

const RECENT_SALES_COLUMNS: TableColumn<RecentSaleRow>[] = [
  { header: "Bill No", render: (r) => <span className="font-medium text-brand">{r.billNo}</span> },
  { header: "Customer", render: (r) => r.customer },
  { header: "Payment", render: (r) => <Badge tone="neutral">{r.paymentMethod}</Badge> },
  { header: "Salesman", render: (r) => r.salesmanId ?? "—" },
  {
    header: "Amount",
    className: "text-right",
    render: (r) => <span className="font-medium text-gray-900">{formatCurrency(r.amount)}</span>,
  },
];

const LOW_STOCK_COLUMNS: TableColumn<LowStockRow>[] = [
  {
    header: "Product",
    render: (r) => (
      <div>
        <p className="font-medium text-gray-900">{r.productName}</p>
        <p className="text-xs text-gray-400">{r.variantLabel}</p>
      </div>
    ),
  },
  {
    header: "Left",
    className: "text-right",
    render: (r) => (
      <Badge tone={r.quantity === 0 ? "danger" : "warning"}>
        {r.quantity === 0 ? "Out of stock" : `${r.quantity} left`}
      </Badge>
    ),
  },
];

export function AdminDashboardScreen() {
  const chartData = useMemo(buildLast7Days, []);

  // Empty until the Sales and Inventory modules feed real data in.
  const recentSales: RecentSaleRow[] = [];
  const lowStock: LowStockRow[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-title text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-400">Overview of today's shop activity</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {KPIS.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* 7-day chart */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-section text-gray-900">7-Day Sales Activity</h3>
            <p className="text-xs text-gray-400">Daily sales total for the last week</p>
          </div>
          <span className="flex items-center gap-2 text-xs text-gray-500">
            <span className="h-2.5 w-2.5 rounded-full bg-brand" />
            Sales
          </span>
        </div>
        <SalesBarChart data={chartData} formatValue={(v) => formatCurrency(v)} />
      </Card>

      {/* Recent sales + low stock */}
      <div className="grid grid-cols-3 gap-6">
        <section className="col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-section text-gray-900">Recent Sales</h3>
            <Link to="/sales" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          </div>
          <Table
            columns={RECENT_SALES_COLUMNS}
            data={recentSales}
            keyExtractor={(r) => r.id}
            emptyMessage="No sales yet. Recent bills will appear here."
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-section text-gray-900">Low Stock</h3>
              <Badge tone="warning">Below {LOW_STOCK_THRESHOLD}</Badge>
            </div>
            <Link to="/inventory" className="text-sm font-medium text-brand hover:underline">
              Manage
            </Link>
          </div>
          <Table
            columns={LOW_STOCK_COLUMNS}
            data={lowStock}
            keyExtractor={(r) => r.id}
            emptyMessage="All products are well stocked."
          />
        </section>
      </div>
    </div>
  );
}