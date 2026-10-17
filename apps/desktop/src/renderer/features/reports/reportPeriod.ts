import type { ReportQueryParams } from "../../services/reports";
import {
  describeRange,
  resolveRange,
  toLocalYmd,
  type DateRange,
  type RangePreset,
} from "../expenses/expenseRange";
import { formatDayFull, formatMonthLong, ymdToUtcDate } from "./reportFormat";

export const MAX_REPORT_DAYS = 731;

export interface PeriodState {
  preset: RangePreset;
  /** Any day inside the wanted day/week/month (YYYY-MM-DD). */
  anchor: string;
  customFrom: string;
  customTo: string;
}

export interface ResolvedPeriod {
  range: DateRange;
  days: number | null;
  /** True when a report can be requested. */
  ready: boolean;
  /** Why it can't be requested yet. */
  problem: string | null;
  query: ReportQueryParams | null;
}

export function initialPeriod(): PeriodState {
  return { preset: "month", anchor: toLocalYmd(new Date()), customFrom: "", customTo: "" };
}

export function parseLocalYmd(ymd: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function daysBetween(from: string, to: string): number {
  return Math.round((ymdToUtcDate(to).getTime() - ymdToUtcDate(from).getTime()) / 86_400_000) + 1;
}

export function resolvePeriod(state: PeriodState): ResolvedPeriod {
  if (state.preset === "custom") {
    // Reversed dates are swapped, the same way the Expenses screen does it.
    const range = resolveRange("custom", state.customFrom, state.customTo);
    if (!range.from || !range.to) {
      return {
        range,
        days: null,
        ready: false,
        problem: "Choose both a start date and an end date.",
        query: null,
      };
    }
    const days = daysBetween(range.from, range.to);
    if (days > MAX_REPORT_DAYS) {
      return {
        range,
        days,
        ready: false,
        problem: `A report can cover at most ${MAX_REPORT_DAYS} days (about two years). Choose a shorter range.`,
        query: null,
      };
    }
    return {
      range,
      days,
      ready: true,
      problem: null,
      query: { period: "custom", dateFrom: range.from, dateTo: range.to },
    };
  }

  const range = resolveRange(state.preset, "", "", parseLocalYmd(state.anchor));
  const days = range.from && range.to ? daysBetween(range.from, range.to) : null;
  return {
    range,
    days,
    ready: true,
    problem: null,
    query: { period: state.preset, date: state.anchor },
  };
}

/** Moves to the previous (-1) or next (1) day, week or month. Custom ranges don't step. */
export function shiftAnchor(state: PeriodState, direction: -1 | 1): PeriodState {
  const base = parseLocalYmd(state.anchor);
  const y = base.getFullYear();
  const m = base.getMonth();
  const d = base.getDate();

  if (state.preset === "day") {
    return { ...state, anchor: toLocalYmd(new Date(y, m, d + direction)) };
  }
  if (state.preset === "week") {
    return { ...state, anchor: toLocalYmd(new Date(y, m, d + 7 * direction)) };
  }
  if (state.preset === "month") {
    return { ...state, anchor: toLocalYmd(new Date(y, m + direction, 1)) };
  }
  return state;
}

export function periodTitle(preset: RangePreset, range: DateRange): string {
  if (!range.from || !range.to) return "Choose a date range";
  if (preset === "day") return formatDayFull(range.from);
  if (preset === "month") return formatMonthLong(range.from);
  return describeRange(range);
}