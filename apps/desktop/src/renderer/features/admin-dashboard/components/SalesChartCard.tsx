import { useMemo } from "react";
import { Card } from "@muzammil-pos/ui";
import { formatCurrency } from "@muzammil-pos/utils";
import { useElementWidth } from "../../../hooks/useElementWidth";
import type { DashboardData } from "../../../services/dashboard";
import { barChartSvg } from "../../reports/charts";
import { SvgChart } from "../../reports/components/SvgChart";
import { formatCompactMoney, formatDayFull, plural } from "../../reports/reportFormat";

const weekdayFormatter = new Intl.DateTimeFormat("en-PK", { weekday: "short", timeZone: "UTC" });

function weekdayLabel(ymd: string): string {
  return weekdayFormatter.format(new Date(`${ymd}T00:00:00.000Z`));
}

/** The 7-day bar chart. It measures its card and redraws to fit, so it stays the same height on any screen. */
export function SalesChartCard({ data }: { data: DashboardData }) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const { daily, total } = data.salesLast7Days;

  const svg = useMemo(() => {
    const points = daily.map((day, index) => ({
      label: index === daily.length - 1 ? "Today" : weekdayLabel(day.date),
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
      height: 240,
      width: width >= 320 ? width : undefined,
    });
  }, [daily, width]);

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-section text-gray-900">7-Day Sales Activity</h3>
          <p className="text-xs text-gray-400">Net sales per day. Darkest bar = best day. Hover a bar for details.</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">{formatCurrency(total.netSales)}</p>
          <p className="text-xs text-gray-400">{plural(total.billCount, "bill")} in 7 days</p>
        </div>
      </div>
      <div ref={ref} className="w-full min-w-0">
        <SvgChart svg={svg} />
      </div>
    </Card>
  );
}