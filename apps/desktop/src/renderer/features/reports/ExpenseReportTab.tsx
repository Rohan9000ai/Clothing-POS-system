import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import clsx from "clsx";
import { Badge, Button, Card, Table, type TableColumn } from "@muzammil-pos/ui";
import { formatCurrency } from "@muzammil-pos/utils";
import { reportsApi, type ExpenseReport, type ReportQueryParams } from "../../services/reports";
import { useToastStore } from "../../store/toastStore";
import { describeRange } from "../expenses/expenseRange";
import { EXPENSE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "../expenses/expenseMeta";
import { expenseChartSvg } from "./charts";
import { buildExpenseReportHtml } from "./expenseReportPdf";
import { ShareBars } from "./components/ShareBars";
import { StatCard } from "./components/StatCard";
import { SvgChart } from "./components/SvgChart";
import { formatDayFull, formatDayMedium, plural } from "./reportFormat";
import { useReportData } from "./useReportData";

type LargestExpense = ExpenseReport["largestExpenses"][number];

const LARGEST_COLUMNS: TableColumn<LargestExpense>[] = [
  { header: "Date", render: (row) => <span className="whitespace-nowrap text-gray-600">{formatDayMedium(row.date)}</span> },
  {
    header: "Title",
    render: (row) => {
      const links = [
        row.supplierName ? `Supplier: ${row.supplierName}` : null,
        row.salesmanName ? `Salesman: ${row.salesmanName}` : null,
      ].filter((link): link is string => link !== null);
      return (
        <div>
          <p className="font-medium text-gray-900">{row.title}</p>
          {links.length > 0 && <p className="text-xs text-gray-400">{links.join(" · ")}</p>}
        </div>
      );
    },
  },
  {
    header: "Type",
    render: (row) => (
      <span className="flex items-center gap-1.5">
        <Badge tone="brand">{EXPENSE_TYPE_LABELS[row.type]}</Badge>
        {!row.inProfitLoss && <Badge tone="warning">Not in profit</Badge>}
      </span>
    ),
  },
  { header: "Method", render: (row) => <span className="text-gray-600">{PAYMENT_METHOD_LABELS[row.paymentMethod]}</span> },
  {
    header: "Amount",
    className: "text-right",
    render: (row) => <span className="font-medium text-gray-900">{formatCurrency(row.amount)}</span>,
  },
];

interface ExpenseReportTabProps {
  query: ReportQueryParams | null;
  shopName: string;
}

export function ExpenseReportTab({ query, shopName }: ExpenseReportTabProps) {
  const push = useToastStore((s) => s.push);
  const { data, isLoading, error, reload } = useReportData(reportsApi.expenses, query);
  const [isExporting, setIsExporting] = useState(false);

  const chart = useMemo(() => (data ? expenseChartSvg(data) : null), [data]);

  async function handleExport() {
    if (!data) return;
    setIsExporting(true);
    try {
      const html = buildExpenseReportHtml(data, shopName);
      const fileName = `muzammil-expense-report_${data.range.from}_to_${data.range.to}.pdf`;
      const result = await window.muzammilPOS.savePdf(html, fileName);
      if (result.success) push("success", "Expense report saved as PDF.");
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
    return <Card className="text-center text-sm text-gray-400">Loading the expense report…</Card>;
  }

  const { summary, previous, voided, highestExpenseDay } = data;
  const compare = `vs ${describeRange({ from: previous.from, to: previous.to })}`;

  return (
    <div className={clsx("space-y-6 transition-opacity", isLoading && "opacity-60")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-section text-gray-900">Expense report</h3>
          <p className="text-xs text-gray-400">
            {describeRange({ from: data.range.from, to: data.range.to })} ·{" "}
            {plural(summary.count, "entry", "entries")} · deleted expenses excluded
          </p>
        </div>
        <Button variant="secondary" onClick={handleExport} isLoading={isExporting} disabled={isLoading}>
          <FileDown size={16} />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total expenses"
          value={formatCurrency(summary.total)}
          hint={`Average ${formatCurrency(summary.average)} per entry`}
          change={previous.totalChangePercent}
          increaseIsGood={false}
          compareLabel={compare}
        />
        <StatCard
          label="Entries"
          value={String(summary.count)}
          change={previous.countChangePercent}
          increaseIsGood={false}
          compareLabel={compare}
        />
        <StatCard
          label="Running costs"
          value={formatCurrency(summary.profitLossExpenses)}
          hint="Counted when working out profit"
        />
        <StatCard
          label="Paid to suppliers"
          value={formatCurrency(summary.supplierPayments)}
          hint="Stock money. Not counted in profit."
        />
      </div>

      <Card>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">Operating</p>
            <p className="mt-0.5 font-medium text-gray-900">{formatCurrency(summary.operating)}</p>
            <p className="text-xs text-gray-400">Electricity, salaries, payouts</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Taxes and other</p>
            <p className="mt-0.5 font-medium text-gray-900">{formatCurrency(summary.taxesAndOther)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Highest expense day</p>
            <p className="mt-0.5 font-medium text-gray-900">
              {highestExpenseDay ? formatDayFull(highestExpenseDay.date) : "—"}
            </p>
            {highestExpenseDay && (
              <p className="text-xs text-gray-400">
                {formatCurrency(highestExpenseDay.amount)} · {plural(highestExpenseDay.count, "entry", "entries")}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400">Deleted expenses (excluded)</p>
            <p className="mt-0.5 font-medium text-gray-900">{voided.count}</p>
            {voided.count > 0 && <p className="text-xs text-gray-400">{formatCurrency(voided.amount)}</p>}
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Expenses by {chart.grain}</h4>
          <p className="text-xs text-gray-400">Darkest bar = biggest {chart.grain}. Hover a bar for details.</p>
        </div>
        <SvgChart svg={chart.svg} />
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h4 className="mb-4 text-sm font-semibold text-gray-900">By type</h4>
          <ShareBars
            color="#DC2626"
            rows={data.byType.map((row) => ({
              key: row.type,
              label: EXPENSE_TYPE_LABELS[row.type],
              value: formatCurrency(row.amount),
              detail: `${plural(row.count, "entry", "entries")} · ${row.sharePercent}% of all expenses`,
              percent: row.sharePercent,
              tag: row.inProfitLoss ? undefined : "Not in profit",
            }))}
          />
          <p className="mt-4 text-xs text-gray-400">
            Money paid to suppliers is the cost of stock. It reaches profit when that stock is sold, so counting it
            again here would charge it twice.
          </p>
        </Card>
        <Card>
          <h4 className="mb-4 text-sm font-semibold text-gray-900">By payment method</h4>
          <ShareBars
            color="#F87171"
            rows={data.byPaymentMethod.map((row) => ({
              key: row.method,
              label: PAYMENT_METHOD_LABELS[row.method],
              value: formatCurrency(row.amount),
              detail: `${plural(row.count, "entry", "entries")} · ${row.sharePercent}% of all expenses`,
              percent: row.sharePercent,
            }))}
          />
        </Card>
      </div>

      <Card>
        <h4 className="mb-4 text-sm font-semibold text-gray-900">Largest expenses</h4>
        <Table
          columns={LARGEST_COLUMNS}
          data={data.largestExpenses}
          keyExtractor={(row) => row.id}
          emptyMessage="No expenses in this period."
        />
      </Card>

      <p className="text-xs text-gray-400">
        Each expense belongs to the date typed in its form. Deleted expenses are never included.
      </p>
    </div>
  );
}