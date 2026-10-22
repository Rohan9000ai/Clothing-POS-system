import { formatCurrency } from "@muzammil-pos/utils";
import { escapeHtml } from "../../utils/receiptTemplates";
import type { ExpenseReport, FinancialReport, SalesReport } from "../../services/reports";
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
  /** Drawing width in pixels. Defaults to 760. Pass the real container width to keep text sharp and the height steady. */
  width?: number;
}

/**
 * Builds a self-contained SVG string. All text is escaped. Hovering a bar shows
 * its tooltip (a native SVG <title>), so the same markup works on screen and in the PDF.
 */
export function barChartSvg(options: BarChartOptions): string {
  const { points, color, highlightColor, formatAxis, emptyText, ariaLabel } = options;
  const width = options.width ?? 760;
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

/** Axis ticks for data that may go below zero. Zero is always a tick. */
function niceTicksSigned(minValue: number, maxValue: number): { niceMin: number; niceMax: number; ticks: number[] } {
  if (!(maxValue > 0) && !(minValue < 0)) return { niceMin: 0, niceMax: 0, ticks: [0] };
  const rawStep = (maxValue - minValue) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const factor = STEP_CANDIDATES.find((candidate) => candidate >= normalized - 1e-9) ?? 10;
  const step = factor * magnitude;
  const up = Math.ceil(maxValue / step - 1e-9);
  const down = Math.ceil(-minValue / step - 1e-9);
  const ticks: number[] = [];
  for (let i = -down; i <= up; i++) ticks.push(i === 0 ? 0 : i * step);
  return { niceMin: down === 0 ? 0 : -down * step, niceMax: up * step, ticks };
}

export interface MultiSeries {
  name: string;
  color: string;
  /** Used for values below zero (a loss). Defaults to `color`. */
  negativeColor?: string;
  values: number[];
}

export interface MultiBarChartOptions {
  categories: { label: string; title: string }[];
  series: MultiSeries[];
  formatAxis: (value: number) => string;
  formatValue: (value: number) => string;
  emptyText: string;
  ariaLabel: string;
  height?: number;
}

/** Grouped bar chart (one group per category) that handles negative values. */
export function multiBarChartSvg(options: MultiBarChartOptions): string {
  const { categories, series, formatAxis, formatValue, emptyText, ariaLabel } = options;
  const width = 760;
  const height = options.height ?? 260;
  const legend = series.length > 1;
  const padLeft = 54;
  const padRight = 12;
  const padTop = legend ? 30 : 14;
  const padBottom = 30;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  let maxValue = 0;
  let minValue = 0;
  for (const s of series) {
    for (const v of s.values) {
      if (v > maxValue) maxValue = v;
      if (v < minValue) minValue = v;
    }
  }
  const { niceMin, niceMax, ticks } = niceTicksSigned(minValue, maxValue);
  const span = niceMax - niceMin;

  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${escapeHtml(
      ariaLabel
    )}" font-family="Arial, Helvetica, sans-serif">`,
  ];

  if (legend) {
    series.forEach((s, index) => {
      const x = padLeft + index * 170;
      out.push(`<rect x="${x}" y="8" width="10" height="10" rx="2" fill="${s.color}"/>`);
      out.push(`<text x="${x + 15}" y="17" font-size="11" fill="#374151">${escapeHtml(s.name)}</text>`);
    });
  }

  if (categories.length === 0 || span <= 0) {
    const baseline = padTop + plotHeight;
    out.push(`<line x1="${padLeft}" y1="${baseline}" x2="${width - padRight}" y2="${baseline}" stroke="#9CA3AF"/>`);
    out.push(
      `<text x="${padLeft + plotWidth / 2}" y="${padTop + plotHeight / 2}" text-anchor="middle" font-size="13" fill="#9CA3AF">${escapeHtml(
        emptyText
      )}</text>`
    );
    out.push("</svg>");
    return out.join("");
  }

  const yOf = (value: number) => padTop + ((niceMax - value) / span) * plotHeight;
  const zeroY = yOf(0);

  for (const tick of ticks) {
    const y = yOf(tick);
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

  const slot = plotWidth / categories.length;
  const groupWidth = Math.min(slot * 0.8, series.length * 34);
  const barSlot = groupWidth / series.length;
  const barWidth = Math.max(barSlot - 1, 1.2);
  const longestLabel = categories.reduce((longest, c) => Math.max(longest, c.label.length), 1);
  const labelEvery = Math.max(1, Math.ceil((longestLabel * 6 + 10) / slot));

  categories.forEach((category, index) => {
    const slotX = padLeft + slot * index;
    const groupX = slotX + (slot - groupWidth) / 2;
    const tooltip = [category.title, ...series.map((s) => `${s.name}: ${formatValue(s.values[index] ?? 0)}`)].join("\n");

    out.push(`<g><title>${escapeHtml(tooltip)}</title>`);
    // A full-height invisible column, so thin bars are still easy to hover.
    out.push(
      `<rect x="${slotX.toFixed(1)}" y="${padTop}" width="${slot.toFixed(1)}" height="${plotHeight}" fill="transparent"/>`
    );
    series.forEach((s, seriesIndex) => {
      const value = s.values[index] ?? 0;
      if (value === 0) return;
      const y = yOf(value);
      const top = Math.min(y, zeroY);
      const barHeight = Math.max(Math.abs(zeroY - y), 1.5);
      const color = value < 0 ? (s.negativeColor ?? s.color) : s.color;
      const x = groupX + seriesIndex * barSlot + (barSlot - barWidth) / 2;
      out.push(
        `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(
          1
        )}" rx="1.5" fill="${color}"/>`
      );
    });
    out.push("</g>");

    if (index % labelEvery === 0) {
      out.push(
        `<text x="${(slotX + slot / 2).toFixed(1)}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#6B7280">${escapeHtml(
          category.label
        )}</text>`
      );
    }
  });

  out.push("</svg>");
  return out.join("");
}

/** Like buildChartPoints, but for several values per day (sales, costs, profit...). */
export function groupDays(
  days: { date: string; values: number[] }[],
  grain: Grain,
  rangeFrom: string,
  rangeTo: string
): { label: string; title: string; values: number[] }[] {
  if (grain === "day") {
    return days.map((day, index) => {
      const dayOfMonth = Number(day.date.slice(8, 10));
      return {
        label: index === 0 || dayOfMonth === 1 ? formatDayShort(day.date) : String(dayOfMonth),
        title: formatDayFull(day.date),
        values: day.values,
      };
    });
  }

  const groups = new Map<string, { start: string; end: string; values: number[] }>();
  for (const day of days) {
    const key = grain === "week" ? weekStart(day.date) : day.date.slice(0, 7);
    const group = groups.get(key) ?? { start: day.date, end: day.date, values: day.values.map(() => 0) };
    if (day.date < group.start) group.start = day.date;
    if (day.date > group.end) group.end = day.date;
    day.values.forEach((value, i) => {
      group.values[i] = (group.values[i] ?? 0) + value;
    });
    groups.set(key, group);
  }

  const spansYears = rangeFrom.slice(0, 4) !== rangeTo.slice(0, 4);

  return [...groups.values()].map((group) =>
    grain === "week"
      ? {
          label: formatDayShort(group.start),
          title: `${formatDayShort(group.start)} – ${formatDayMedium(group.end)}`,
          values: group.values,
        }
      : {
          label: spansYears
            ? `${formatMonthShort(group.start)} '${group.start.slice(2, 4)}`
            : formatMonthShort(group.start),
          title: formatMonthLong(group.start),
          values: group.values,
        }
  );
}

/** The two charts of the profit and loss tab and PDF: sales against costs, and net profit (can be negative). */
export function financialChartsSvg(report: FinancialReport): { grain: Grain; salesAndCosts: string; profit: string } {
  const grain = chooseGrain(report.range.days);
  const grouped = groupDays(
    report.daily.map((day) => ({ date: day.date, values: [day.netSales, day.cogs + day.expenses, day.netProfit] })),
    grain,
    report.range.from,
    report.range.to
  );
  const categories = grouped.map((group) => ({ label: group.label, title: group.title }));
  const pick = (index: number) => grouped.map((group) => group.values[index] ?? 0);

  return {
    grain,
    salesAndCosts: multiBarChartSvg({
      categories,
      series: [
        { name: "Net sales", color: "#4F46E5", values: pick(0) },
        { name: "Costs (stock sold + expenses)", color: "#F87171", values: pick(1) },
      ],
      formatAxis: formatCompactMoney,
      formatValue: formatCurrency,
      emptyText: "No sales or expenses in this period",
      ariaLabel: `Sales and costs by ${grain}`,
    }),
    profit: multiBarChartSvg({
      categories,
      series: [{ name: "Net profit", color: "#16A34A", negativeColor: "#DC2626", values: pick(2) }],
      formatAxis: formatCompactMoney,
      formatValue: formatCurrency,
      emptyText: "No sales or expenses in this period",
      ariaLabel: `Net profit by ${grain}`,
      height: 220,
    }),
  };
}