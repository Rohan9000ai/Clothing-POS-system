import { useMemo, useState } from "react";
import clsx from "clsx";
import { Card, Button } from "@muzammil-pos/ui";
import { formatCurrency } from "@muzammil-pos/utils";
import { reportsApi, type FinancialReport, type ReportQueryParams } from "../../services/reports";
import { describeRange } from "../expenses/expenseRange";
import { EXPENSE_TYPE_LABELS } from "../expenses/expenseMeta";
import { financialChartsSvg } from "./charts";
import { buildFinancialReportHtml } from "./financialReportPdf";
import { ReportHeader } from "./components/ReportHeader";
import { ShareBars } from "./components/ShareBars";
import { StatCard } from "./components/StatCard";
import { SvgChart } from "./components/SvgChart";
import { percentChange, plural } from "./reportFormat";
import { saveReportPdf } from "./saveReportPdf";
import { useReportData } from "./useReportData";

const SOURCE_LABELS = {
  PRODUCT_COST_PRICE: "Product cost price",
  SUPPLIER_BILL: "Latest supplier bill",
  UNKNOWN: "Not known",
} as const;

function StatementRow({
  label,
  note,
  amount,
  strong,
  tone,
  margin,
}: {
  label: string;
  note?: string;
  amount: number;
  strong?: boolean;
  tone?: "good" | "bad";
  margin?: number | null;
}) {
  return (
    <div className={clsx("flex items-center justify-between px-4 py-3", strong && "bg-gray-50")}>
      <div>
        <p className={clsx("text-sm", strong ? "font-semibold text-gray-900" : "text-gray-700")}>{label}</p>
        {note && <p className="text-xs text-gray-400">{note}</p>}
      </div>
      <div className="text-right">
        <p
          className={clsx(
            "text-sm font-medium",
            tone === "bad" ? "text-danger" : tone === "good" ? "text-success" : "text-gray-900"
          )}
        >
          {formatCurrency(amount)}
        </p>
        {margin !== undefined && (
          <p className="text-xs text-gray-400">{margin === null ? "—" : `${margin}% of sales`}</p>
        )}
      </div>
    </div>
  );
}

interface FinancialReportTabProps {
  query: ReportQueryParams | null;
  shopName: string;
}

export function FinancialReportTab({ query, shopName }: FinancialReportTabProps) {
  const { data, isLoading, error, reload } = useReportData(reportsApi.financial, query);
  const [isExporting, setIsExporting] = useState(false);

  const charts = useMemo(() => (data ? financialChartsSvg(data) : null), [data]);

  async function handleExport() {
    if (!data) return;
    setIsExporting(true);
    try {
      await saveReportPdf(
        () => buildFinancialReportHtml(data, shopName),
        `muzammil-profit-and-loss_${data.range.from}_to_${data.range.to}.pdf`,
        "Profit and loss report saved as PDF."
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

  if (!data || !charts) {
    return <Card className="text-center text-sm text-gray-400">Loading the profit and loss report…</Card>;
  }

  const { profitLoss: pl, previous, cash, cost, expenses, voided } = data;
  const compare = `vs ${describeRange({ from: previous.from, to: previous.to })}`;
  const isLoss = pl.netProfit < 0;

  return (
    <div className={clsx("space-y-6 transition-opacity", isLoading && "opacity-60")}>
      <ReportHeader
        title="Profit and loss"
        subtitle={`${describeRange({ from: data.range.from, to: data.range.to })} · sales, expenses and profit together`}
        onExport={handleExport}
        isExporting={isExporting}
        disabled={isLoading}
      />

      {pl.isEstimate && (
        <div className="rounded-card border border-warning/30 bg-warning-light px-4 py-3 text-sm text-warning">
          <p className="font-medium">
            This profit is an estimate: the cost is known for {cost.coveragePercent}% of what you sold.
          </p>
          <p className="mt-0.5 text-xs">
            Pieces with no known cost count as free, so the real profit is lower. Add a cost price in Inventory, or
            record the supplier's bill.
            {cost.gaps.length > 0 &&
              ` Missing a cost: ${cost.gaps
                .map((gap) => `${gap.name} (${plural(gap.quantity, "piece")})`)
                .join(", ")}.`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Net sales"
          value={formatCurrency(pl.netSales)}
          hint={plural(data.billCount, "bill")}
          change={previous.netSalesChangePercent}
          compareLabel={compare}
        />
        <StatCard
          label="Gross profit"
          value={formatCurrency(pl.grossProfit)}
          hint={pl.grossMarginPercent === null ? "No sales" : `${pl.grossMarginPercent}% of sales`}
          change={percentChange(pl.grossProfit, previous.grossProfit)}
          compareLabel={compare}
        />
        <StatCard
          label="Running expenses"
          value={formatCurrency(pl.totalExpenses)}
          hint="Not counting supplier payments"
          change={previous.totalExpensesChangePercent}
          increaseIsGood={false}
          compareLabel={compare}
        />
        <StatCard
          label={pl.isEstimate ? "Net profit (estimate)" : "Net profit"}
          value={formatCurrency(pl.netProfit)}
          valueTone={pl.netSales === 0 && pl.totalExpenses === 0 ? undefined : isLoss ? "bad" : "good"}
          hint={pl.netMarginPercent === null ? "No sales" : `${pl.netMarginPercent}% of sales`}
          change={previous.netProfitChangePercent}
          compareLabel={compare}
        />
      </div>

      <div className="grid grid-cols-5 gap-6">
        <Card className="col-span-3 p-0">
          <div className="border-b border-gray-100 px-4 py-3">
            <h4 className="text-sm font-semibold text-gray-900">Profit and loss statement</h4>
          </div>
          <div className="divide-y divide-gray-100">
            <StatementRow label="Net sales" note="After discounts, completed bills only" amount={pl.netSales} />
            <StatementRow label="Less: cost of goods sold" note="What the pieces you sold cost you" amount={pl.cogs} />
            <StatementRow label="Gross profit" strong amount={pl.grossProfit} margin={pl.grossMarginPercent} />
            <StatementRow
              label="Less: operating expenses"
              note="Electricity, salaries, payouts"
              amount={pl.operatingExpenses}
            />
            <StatementRow label="Less: taxes and other" amount={pl.taxesAndOther} />
            <StatementRow
              label="Net profit"
              strong
              amount={pl.netProfit}
              tone={isLoss ? "bad" : "good"}
              margin={pl.netMarginPercent}
            />
          </div>
          <p className="border-t border-gray-100 px-4 py-3 text-xs text-gray-400">
            Money paid to suppliers ({formatCurrency(expenses.supplierPayments)}) is not a cost here. It is the cost of
            stock, which reaches profit as "cost of goods" when the stock is sold. Counting it again would charge the same
            money twice.
          </p>
        </Card>

        <Card className="col-span-2">
          <h4 className="text-sm font-semibold text-gray-900">Cash view</h4>
          <p className="mb-4 text-xs text-gray-400">Money in against money out, on the day it moved.</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Received from customers</span>
              <span className="font-medium text-gray-900">{formatCurrency(cash.collected)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Paid out in expenses</span>
              <span className="font-medium text-gray-900">{formatCurrency(cash.expensesPaid)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-3">
              <span className="font-semibold text-gray-900">Net cash</span>
              <span className={clsx("font-semibold", cash.netCash < 0 ? "text-danger" : "text-success")}>
                {formatCurrency(cash.netCash)}
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            This includes {formatCurrency(expenses.supplierPayments)} paid to suppliers, so it differs from profit. Both
            are correct: profit shows how the business did, cash shows what moved.
          </p>
        </Card>
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Sales and costs by {charts.grain}</h4>
          <p className="text-xs text-gray-400">Costs = stock sold + running expenses. Hover a bar for details.</p>
        </div>
        <SvgChart svg={charts.salesAndCosts} />
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Net profit by {charts.grain}</h4>
          <p className="text-xs text-gray-400">Green is profit, red is a loss.</p>
        </div>
        <SvgChart svg={charts.profit} />
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h4 className="mb-4 text-sm font-semibold text-gray-900">Expenses by type</h4>
          <ShareBars
            color="#DC2626"
            rows={expenses.byType.map((row) => ({
              key: row.type,
              label: EXPENSE_TYPE_LABELS[row.type],
              value: formatCurrency(row.amount),
              detail: `${plural(row.count, "entry", "entries")} · ${row.sharePercent}% of all expenses`,
              percent: row.sharePercent,
              tag: row.inProfitLoss ? undefined : "Not in profit",
            }))}
          />
        </Card>
        <Card>
          <h4 className="mb-1 text-sm font-semibold text-gray-900">How the cost of goods was found</h4>
          <p className="mb-4 text-xs text-gray-400">Cost is known for {cost.coveragePercent}% of what was sold.</p>
          <div className="space-y-3 text-sm">
            {cost.bySource.map((row) => (
              <div key={row.source} className="flex items-center justify-between">
                <span className="text-gray-600">{SOURCE_LABELS[row.source]}</span>
                <span className="text-gray-900">
                  {plural(row.quantity, "piece")} · sold for {formatCurrency(row.revenue)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Order of preference: the product's cost price, then the newest supplier bill for that size and color, then the
            newest bill for the product. The cost used is today's cost, not what it was on the day of the sale.
          </p>
        </Card>
      </div>

      <p className="text-xs text-gray-400">
        {voided.sales.billCount > 0 && `${plural(voided.sales.billCount, "voided bill")} excluded. `}
        {voided.expenses.count > 0 && `${plural(voided.expenses.count, "deleted expense")} excluded. `}
        Each expense belongs to the date typed in its form; each sale to the day on the shop computer's clock.
      </p>
    </div>
  );
}