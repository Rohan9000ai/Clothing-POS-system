import { formatCurrency } from "@muzammil-pos/utils";
import { escapeHtml } from "../../utils/receiptTemplates";
import type { ExpenseReport, SalesReport } from "../../services/reports";
import {
  formatCompactMoney,
  formatDayFull,
  formatDayMedium,
  formatDayShort,
  formatMonthLong,
  formatMonthShort,
  plural,
  ymdToUtcDate,
} from "./reportFormat";

export type Grain = "day" | "week" | "month";

export interface DayValue {
  date: string;
  value: number;
  count: number;
}

export interface ChartPoint {
  label: string;
  tooltip: string;
  value: number;
}

/** Up to a month: a bar per day. Up to ~4 months: per week. Longer: per month. */
export function chooseGrain(days: number): Grain {
  if (days <= 31) return "day";
  if (days <= 120) return "week";
  return "month";
}

function weekStart(ymd: string): string {
  const date = ymdToUtcDate(ymd);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

export function buildChartPoints(
  daily: DayValue[],
  grain: Grain,
  rangeFrom: string,
  rangeTo: string,
  describe: (value: number, count: number) => string
): ChartPoint[] {
  if (grain === "day") {
    return daily.map((day, index) => {
      const dayOfMonth = Number(day.date.slice(8, 10));
      return {
        label: index === 0 || dayOfMonth === 1 ? formatDayShort(day.date) : String(dayOfMonth),
        tooltip: `${formatDayFull(day.date)} — ${describe(day.value, day.count)}`,
        value: day.value,
      };
    });
  }

  const groups = new Map<string, { start: string; end: string; value: number; count: number }>();
  for (const day of daily) {
    const key = grain === "week" ? weekStart(day.date) : day.date.slice(0, 7);
    const group = groups.get(key) ?? { start: day.date, end: day.date, value: 0, count: 0 };
    if (day.date < group.start) group.start = day.date;
    if (day.date > group.end) group.end = day.date;
    group.value += day.value;
    group.count += day.count;
    groups.set(key, group);
  }

  const spansYears = rangeFrom.slice(0, 4) !== rangeTo.slice(0, 4);

  return [...groups.values()].map((group) => {
    if (grain === "week") {
      return {
        label: formatDayShort(group.start),
        tooltip: `${formatDayShort(group.start)} – ${formatDayMedium(group.end)} — ${describe(group.value, group.count)}`,
        value: group.value,
      };
    }
    const month = formatMonthShort(group.start);
    return {
      label: spansYears ? `${month} '${group.start.slice(2, 4)}` : month,
      tooltip: `${formatMonthLong(group.start)} — ${describe(group.value, group.count)}`,
      value: group.value,
    };
  });
}

const STEP_CANDIDATES = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** Four equal steps up to a rounded maximum, e.g. 0 / 6K / 12K / 18K / 24K. */
export function niceScale(max: number): { niceMax: number; ticks: number[] } {
  if (!(max > 0)) return { niceMax: 0, ticks: [0] };
  const rawStep = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const factor = STEP_CANDIDATES.find((candidate) => candidate >= normalized - 1e-9) ?? 10;
  const step = factor * magnitude;
  return { niceMax: step * 4, ticks: [0, 1, 2, 3, 4].map((i) => i * step) };
}

export interface BarChartOptions {
  points: ChartPoint[];
  color: string;
  /** Used for the tallest bar. */
  highlightColor: string;
  formatAxis: (value: number) => string;
  emptyText: string;
  ariaLabel: string;
  height?: number;
}

/**
 * Builds a self-contained SVG string. All text is escaped. Hovering a bar shows
 * its tooltip (a native SVG <title>), so the same markup works on screen and in the PDF.
 */
export function barChartSvg(options: BarChartOptions): string {
  const { points, color, highlightColor, formatAxis, emptyText, ariaLabel } = options;
  const width = 760;
  const height = options.height ?? 250;
  const padLeft = 54;
  const padRight = 12;
  const padTop = 14;
  const padBottom = 30;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const baseline = padTop + plotHeight;

  const max = points.reduce((best, point) => Math.max(best, point.value), 0);
  const { niceMax, ticks } = niceScale(max);

  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${escapeHtml(
      ariaLabel
    )}" font-family="Arial, Helvetica, sans-serif">`,
  ];

  for (const tick of ticks) {
    const y = niceMax > 0 ? baseline - (tick / niceMax) * plotHeight : baseline;
    out.push(
      `<line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${width - padRight}" y2="${y.toFixed(1)}" stroke="${
        tick === 0 ? "#9CA3AF" : "#E5E7EB"
      }" stroke-width="1"/>`
    );
    out.push(
      `<text x="${padLeft - 8}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#6B7280">${escapeHtml(
        formatAxis(tick)
      )}</text>`
    );
  }

  if (points.length === 0 || max <= 0) {
    out.push(
      `<text x="${padLeft + plotWidth / 2}" y="${padTop + plotHeight / 2}" text-anchor="middle" font-size="13" fill="#9CA3AF">${escapeHtml(
        emptyText
      )}</text>`
    );
    out.push("</svg>");
    return out.join("");
  }

  const slot = plotWidth / points.length;
  const barWidth = Math.min(Math.max(slot * 0.68, 1.5), 44);
  const peakIndex = points.findIndex((point) => point.value === max);
  const longestLabel = points.reduce((longest, point) => Math.max(longest, point.label.length), 1);
  const labelEvery = Math.max(1, Math.ceil((longestLabel * 6 + 10) / slot));

  points.forEach((point, index) => {
    const slotX = padLeft + slot * index;
    const barX = slotX + (slot - barWidth) / 2;
    const barHeight = point.value > 0 ? Math.max((point.value / niceMax) * plotHeight, 1.5) : 0;

    out.push(`<g><title>${escapeHtml(point.tooltip)}</title>`);
    // A full-height invisible column, so thin bars are still easy to hover.
    out.push(
      `<rect x="${slotX.toFixed(1)}" y="${padTop}" width="${slot.toFixed(1)}" height="${plotHeight}" fill="transparent"/>`
    );
    if (barHeight > 0) {
      out.push(
        `<rect x="${barX.toFixed(1)}" y="${(baseline - barHeight).toFixed(1)}" width="${barWidth.toFixed(
          1
        )}" height="${barHeight.toFixed(1)}" rx="2" fill="${index === peakIndex ? highlightColor : color}"/>`
      );
    }
    out.push("</g>");

    if (index % labelEvery === 0) {
      out.push(
        `<text x="${(slotX + slot / 2).toFixed(1)}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#6B7280">${escapeHtml(
          point.label
        )}</text>`
      );
    }
  });

  out.push("</svg>");
  return out.join("");
}

export function salesChartSvg(report: SalesReport): { svg: string; grain: Grain } {
  const grain = chooseGrain(report.range.days);
  const points = buildChartPoints(
    report.daily.map((day) => ({ date: day.date, value: day.netSales, count: day.billCount })),
    grain,
    report.range.from,
    report.range.to,
    (value, count) => `${formatCurrency(value)} · ${plural(count, "bill")}`
  );
  return {
    grain,
    svg: barChartSvg({
      points,
      color: "#4F46E5",
      highlightColor: "#3730A3",
      formatAxis: formatCompactMoney,
      emptyText: "No sales in this period",
      ariaLabel: `Net sales by ${grain}`,
    }),
  };
}

export function expenseChartSvg(report: ExpenseReport): { svg: string; grain: Grain } {
  const grain = chooseGrain(report.range.days);
  const points = buildChartPoints(
    report.daily.map((day) => ({ date: day.date, value: day.amount, count: day.count })),
    grain,
    report.range.from,
    report.range.to,
    (value, count) => `${formatCurrency(value)} · ${plural(count, "expense")}`
  );
  return {
    grain,
    svg: barChartSvg({
      points,
      color: "#F87171",
      highlightColor: "#DC2626",
      formatAxis: formatCompactMoney,
      emptyText: "No expenses in this period",
      ariaLabel: `Expenses by ${grain}`,
    }),
  };
}