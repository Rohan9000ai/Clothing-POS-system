import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import clsx from "clsx";
import { Badge, Button, Card, Table, type TableColumn } from "@muzammil-pos/ui";
import { formatCurrency, formatDate } from "@muzammil-pos/utils";
import { reportsApi, type ReceivablesReport } from "../../services/reports";
import { buildReceivablesReportHtml } from "./receivablesReportPdf";
import { Pager } from "./components/Pager";
import { ReportHeader } from "./components/ReportHeader";
import { ShareBars } from "./components/ShareBars";
import { StatCard } from "./components/StatCard";
import { formatDayMedium, plural } from "./reportFormat";
import { saveReportPdf } from "./saveReportPdf";
import { useReportData } from "./useReportData";

type BillRow = ReceivablesReport["bills"][number];
type CustomerRow = ReceivablesReport["byCustomer"][number];

const PAGE_SIZE = 15;
const NO_QUERY: Record<string, never> = {};

const CUSTOMER_COLUMNS: TableColumn<CustomerRow>[] = [
  { header: "Customer", render: (row) => <span className="font-medium text-gray-900">{row.name}</span> },
  { header: "Bills", className: "text-right", render: (row) => row.billCount },
  { header: "Oldest", className: "text-right", render: (row) => plural(row.oldestDays, "day") },
  {
    header: "Owes",
    className: "text-right",
    render: (row) => <span className="font-medium text-danger">{formatCurrency(row.outstanding)}</span>,
  },
];

export function ReceivablesReportTab({ shopName }: { shopName: string }) {
  const navigate = useNavigate();
  const { data, isLoading, error, reload } = useReportData(reportsApi.receivables, NO_QUERY);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    if (!data) return;
    setIsExporting(true);
    try {
      await saveReportPdf(
        () => buildReceivablesReportHtml(data, shopName),
        `muzammil-receivables_${data.asOf}.pdf`,
        "Receivables report saved as PDF."
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
    return <Card className="text-center text-sm text-gray-400">Loading the receivables report…</Card>;
  }

  const { summary } = data;
  const totalPages = Math.max(1, Math.ceil(data.bills.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = data.bills.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const billColumns: TableColumn<BillRow>[] = [
    {
      header: "Bill",
      render: (row) => (
        <div>
          <p className="font-medium text-brand">{row.billNo}</p>
          <p className="text-xs text-gray-400">{formatDate(row.saleDate)}</p>
        </div>
      ),
    },
    {
      header: "Customer",
      render: (row) => (
        <div>
          <p className="text-gray-900">{row.customerName}</p>
          {row.salesmanName && <p className="text-xs text-gray-400">Salesman: {row.salesmanName}</p>}
        </div>
      ),
    },
    { header: "Bill total", className: "text-right", render: (row) => formatCurrency(row.netTotal) },
    { header: "Paid", className: "text-right", render: (row) => formatCurrency(row.paid) },
    {
      header: "Owes",
      className: "text-right",
      render: (row) => <span className="font-medium text-danger">{formatCurrency(row.outstanding)}</span>,
    },
    {
      header: "Open for",
      render: (row) => (
        <Badge tone={row.daysOpen > 60 ? "danger" : row.daysOpen > 30 ? "warning" : "neutral"}>
          {plural(row.daysOpen, "day")}
        </Badge>
      ),
    },
    {
      header: "Status",
      render: (row) =>
        row.paymentStatus === "PARTIAL" ? <Badge tone="warning">Partly paid</Badge> : <Badge tone="danger">Unpaid</Badge>,
    },
    {
      header: "",
      className: "text-right",
      render: (row) => (
        <button
          title="View invoice"
          aria-label="View invoice"
          onClick={() => navigate(`/invoice/${row.saleId}`)}
          className="rounded-control p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <Eye size={15} />
        </button>
      ),
    },
  ];

  return (
    <div className={clsx("space-y-6 transition-opacity", isLoading && "opacity-60")}>
      <ReportHeader
        title="Receivables"
        subtitle={`Money customers still owe you · as of ${formatDayMedium(data.asOf)}`}
        onExport={handleExport}
        isExporting={isExporting}
        onRefresh={reload}
        disabled={isLoading}
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total to collect"
          value={formatCurrency(summary.totalOutstanding)}
          valueTone={summary.totalOutstanding > 0 ? "bad" : "good"}
          hint={`Of ${formatCurrency(summary.totalBilled)} billed on these bills`}
        />
        <StatCard
          label="Open bills"
          value={String(summary.billCount)}
          hint={`${summary.partialCount} partly paid · ${summary.unpaidCount} unpaid`}
        />
        <StatCard label="Customers" value={String(summary.customerCount)} hint="With something owing" />
        <StatCard
          label="Oldest open bill"
          value={summary.oldestDays === null ? "—" : plural(summary.oldestDays, "day")}
          hint={summary.oldestBillNo ?? "Nothing is owed"}
        />
      </div>

      {summary.billCount === 0 ? (
        <Card className="text-center text-sm text-gray-500">
          Every completed bill is fully paid. Nothing is owed to you.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <h4 className="mb-1 text-sm font-semibold text-gray-900">How long bills have been open</h4>
              <p className="mb-4 text-xs text-gray-400">Older money is harder to collect.</p>
              <ShareBars
                color="#D97706"
                rows={data.aging.map((row) => ({
                  key: row.key,
                  label: row.label,
                  value: formatCurrency(row.amount),
                  detail: `${plural(row.billCount, "bill")} · ${row.sharePercent}% of the total`,
                  percent: row.sharePercent,
                }))}
              />
            </Card>
            <Card>
              <h4 className="mb-4 text-sm font-semibold text-gray-900">By customer</h4>
              <Table
                columns={CUSTOMER_COLUMNS}
                data={data.byCustomer}
                keyExtractor={(row) => row.customerId}
                emptyMessage="Nothing is owed to you."
              />
            </Card>
          </div>

          <Card>
            <h4 className="mb-4 text-sm font-semibold text-gray-900">Open bills (oldest first)</h4>
            <Table
              columns={billColumns}
              data={pageRows}
              keyExtractor={(row) => row.saleId}
              emptyMessage="Every bill is fully paid."
            />
            <Pager page={safePage} totalPages={totalPages} totalItems={data.bills.length} onPage={setPage} />
          </Card>
        </>
      )}

      <p className="text-xs text-gray-400">
        Completed bills that are not fully paid. Voided bills are never included. Recording a customer's later payment
        against a bill is not available yet.
      </p>
    </div>
  );
}