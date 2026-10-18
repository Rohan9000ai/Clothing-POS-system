import { useMemo, useState } from "react";
import clsx from "clsx";
import { Badge, Button, Card, Table, toneForStatus, type TableColumn } from "@muzammil-pos/ui";
import { formatCurrency, formatDateTime } from "@muzammil-pos/utils";
import { reportsApi, type PayablesReport } from "../../services/reports";
import { buildPayablesReportHtml } from "./payablesReportPdf";
import { ReportHeader } from "./components/ReportHeader";
import { ShareBars } from "./components/ShareBars";
import { StatCard } from "./components/StatCard";
import { formatDayMedium, plural } from "./reportFormat";
import { saveReportPdf } from "./saveReportPdf";
import { useReportData } from "./useReportData";

type SupplierRow = PayablesReport["suppliers"][number];

const NO_QUERY: Record<string, never> = {};

const SUPPLIER_COLUMNS: TableColumn<SupplierRow>[] = [
  {
    header: "Supplier",
    render: (row) => (
      <div>
        <p className="font-medium text-gray-900">{row.name}</p>
        <p className="text-xs text-gray-400">{row.phone}</p>
      </div>
    ),
  },
  {
    header: "Status",
    render: (row) => <Badge tone={toneForStatus(row.status)}>{row.status === "ACTIVE" ? "Active" : "Inactive"}</Badge>,
  },
  { header: "Opening", className: "text-right", render: (row) => formatCurrency(row.openingBalance) },
  { header: "Bills received", className: "text-right", render: (row) => formatCurrency(row.purchases) },
  {
    header: "Adjustments",
    className: "text-right",
    render: (row) => (row.adjustments === 0 ? <span className="text-gray-300">—</span> : formatCurrency(row.adjustments)),
  },
  {
    header: "Paid",
    className: "text-right",
    render: (row) => <span className="text-success">{formatCurrency(row.paid)}</span>,
  },
  {
    header: "Remaining",
    className: "text-right",
    render: (row) =>
      row.remaining > 0 ? (
        <span className="font-medium text-danger">{formatCurrency(row.remaining)}</span>
      ) : row.remaining < 0 ? (
        <span className="font-medium text-success">{formatCurrency(-row.remaining)} advance</span>
      ) : (
        <span className="text-gray-400">Settled</span>
      ),
  },
  {
    header: "Last payment",
    render: (row) => (
      <span className="text-gray-600">{row.lastPaymentDate ? formatDayMedium(row.lastPaymentDate) : "—"}</span>
    ),
  },
  {
    header: "Last bill",
    render: (row) => (
      <span className="text-gray-600">{row.lastPurchaseDate ? formatDayMedium(row.lastPurchaseDate) : "—"}</span>
    ),
  },
];

export function PayablesReportTab({ shopName }: { shopName: string }) {
  const { data, isLoading, error, reload } = useReportData(reportsApi.payables, NO_QUERY);
  const [onlyBalances, setOnlyBalances] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const rows = useMemo(() => {
    if (!data) return [];
    return onlyBalances ? data.suppliers.filter((row) => row.remaining !== 0) : data.suppliers;
  }, [data, onlyBalances]);

  async function handleExport() {
    if (!data) return;
    setIsExporting(true);
    try {
      await saveReportPdf(
        () => buildPayablesReportHtml(data, shopName),
        `muzammil-payables_${new Date().toISOString().slice(0, 10)}.pdf`,
        "Payables report saved as PDF."
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
    return <Card className="text-center text-sm text-gray-400">Loading the payables report…</Card>;
  }

  const { summary } = data;
  const owed = data.suppliers.filter((row) => row.remaining > 0);

  return (
    <div className={clsx("space-y-6 transition-opacity", isLoading && "opacity-60")}>
      <ReportHeader
        title="Payables"
        subtitle={`What you owe your suppliers · as of ${formatDateTime(data.generatedAt)}`}
        onExport={handleExport}
        isExporting={isExporting}
        onRefresh={reload}
        disabled={isLoading}
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="You owe suppliers"
          value={formatCurrency(summary.totalOwed)}
          valueTone={summary.totalOwed > 0 ? "bad" : "good"}
          hint={`${plural(summary.owedSupplierCount, "supplier")} with a balance`}
        />
        <StatCard
          label="Advance paid"
          value={formatCurrency(summary.totalAdvance)}
          hint={`${plural(summary.advanceSupplierCount, "supplier")} paid more than they billed`}
        />
        <StatCard label="Bills received" value={formatCurrency(summary.totalPurchased)} hint="All time" />
        <StatCard label="Paid so far" value={formatCurrency(summary.totalPaid)} hint="All time" />
      </div>

      <div className="grid grid-cols-5 gap-6">
        <Card className="col-span-2">
          <h4 className="mb-1 text-sm font-semibold text-gray-900">Who you owe most</h4>
          <p className="mb-4 text-xs text-gray-400">Share of the {formatCurrency(summary.totalOwed)} you owe</p>
          {owed.length === 0 ? (
            <p className="text-sm text-gray-500">You owe nothing to any supplier.</p>
          ) : (
            <ShareBars
              color="#DC2626"
              rows={owed.slice(0, 8).map((row) => ({
                key: row.supplierId,
                label: row.name,
                value: formatCurrency(row.remaining),
                detail: `${row.sharePercent}% of what you owe`,
                percent: row.sharePercent,
              }))}
            />
          )}
        </Card>

        <Card className="col-span-3">
          <h4 className="mb-1 text-sm font-semibold text-gray-900">How the balance is worked out</h4>
          <p className="mb-4 text-xs text-gray-400">Opening balance + bills received + adjustments − payments</p>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Opening balances</span>
              <span className="text-gray-900">{formatCurrency(summary.totalOpening)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Bills received</span>
              <span className="text-gray-900">{formatCurrency(summary.totalPurchased)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payments made</span>
              <span className="text-gray-900">−{formatCurrency(summary.totalPaid)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2.5">
              <span className="font-semibold text-gray-900">Net you owe (after advances)</span>
              <span className={clsx("font-semibold", summary.netPayable > 0 ? "text-danger" : "text-success")}>
                {formatCurrency(summary.netPayable)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Supplier balances</h4>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={onlyBalances}
              onChange={(e) => setOnlyBalances(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Only suppliers with a balance
          </label>
        </div>
        <Table
          columns={SUPPLIER_COLUMNS}
          data={rows}
          keyExtractor={(row) => row.supplierId}
          emptyMessage={onlyBalances ? "You owe nothing to any supplier." : "No suppliers yet."}
        />
      </Card>

      <p className="text-xs text-gray-400">
        These are the same balances as on the Suppliers screen. Record bills and payments there, or use "Paid to supplier"
        in Expenses.
      </p>
    </div>
  );
}