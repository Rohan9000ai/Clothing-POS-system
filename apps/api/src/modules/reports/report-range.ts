/**
 * Date ranges for reports.
 *
 * Every day boundary is the LOCAL calendar day of the computer running the API
 * (the shop PC). That matches the wall clock: a sale at 1 AM belongs to that
 * day, not to "yesterday in UTC".
 */

import { Errors } from "../../common/errors";

export type ReportPeriod = "day" | "week" | "month" | "custom";

export interface ReportRange {
  /** First calendar day included, YYYY-MM-DD. */
  from: string;
  /** Last calendar day included, YYYY-MM-DD. */
  to: string;
  days: number;
  /** Local midnight at the start of `from`. */
  start: Date;
  /** Local midnight AFTER the `to` day. Use as an exclusive upper bound (`lt`). */
  endExclusive: Date;
}

export interface RangeInput {
  period: ReportPeriod;
  date?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
}

export const MAX_REPORT_DAYS = 731;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toYmd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Parses YYYY-MM-DD as a LOCAL date, rejecting impossible ones like 2026-02-31. */
export function parseYmd(value: string, field: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  const day = Number(match?.[3]);
  const date = new Date(year, month - 1, day);

  const valid =
    !!match &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!valid) {
    throw Errors.validation(`"${field}" is not a valid date. Use the format YYYY-MM-DD.`, { field });
  }
  return date;
}

export function buildRange(from: Date, to: Date): ReportRange {
  const start = startOfDay(from);
  const endExclusive = addDays(startOfDay(to), 1);
  // Rounded, so a daylight-saving shift can never produce 6.96 days.
  const days = Math.round((endExclusive.getTime() - start.getTime()) / 86_400_000);

  return {
    from: toYmd(start),
    to: toYmd(addDays(endExclusive, -1)),
    days,
    start,
    endExclusive,
  };
}

export function resolveReportRange(input: RangeInput): ReportRange {
  if (input.period === "custom") {
    if (!input.dateFrom || !input.dateTo) {
      throw Errors.validation("A custom range needs both dateFrom and dateTo.", { field: "dateFrom" });
    }
    const from = parseYmd(input.dateFrom, "dateFrom");
    const to = parseYmd(input.dateTo, "dateTo");

    if (from.getTime() > to.getTime()) {
      throw Errors.validation("dateFrom cannot be after dateTo.", { field: "dateFrom" });
    }

    const range = buildRange(from, to);
    if (range.days > MAX_REPORT_DAYS) {
      throw Errors.validation(
        `A report can cover at most ${MAX_REPORT_DAYS} days. Choose a shorter range.`,
        { field: "dateTo" }
      );
    }
    return range;
  }

  const anchor = input.date ? parseYmd(input.date, "date") : startOfDay(new Date());

  if (input.period === "week") {
    // Monday to Sunday
    const monday = addDays(anchor, -((anchor.getDay() + 6) % 7));
    return buildRange(monday, addDays(monday, 6));
  }

  if (input.period === "month") {
    return buildRange(
      new Date(anchor.getFullYear(), anchor.getMonth(), 1),
      new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
    );
  }

  return buildRange(anchor, anchor);
}

/** The period to compare against: yesterday, last week, last month, or the same-length range before a custom one. */
export function previousRange(period: ReportPeriod, range: ReportRange): ReportRange {
  if (period === "month") {
    const first = new Date(range.start.getFullYear(), range.start.getMonth() - 1, 1);
    return buildRange(first, new Date(first.getFullYear(), first.getMonth() + 1, 0));
  }

  const previousEnd = addDays(range.start, -1);
  return buildRange(addDays(previousEnd, -(range.days - 1)), previousEnd);
}

/**
 * UTC bounds for the same calendar days. Expense dates are stored as the chosen
 * calendar day at UTC midnight, so they must be filtered in UTC.
 */
export function utcBounds(range: ReportRange): { start: Date; endExclusive: Date } {
  const start = new Date(`${range.from}T00:00:00.000Z`);
  const endExclusive = new Date(`${range.to}T00:00:00.000Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return { start, endExclusive };
}

/** The calendar date (YYYY-MM-DD) of a stored expense date. */
export function utcYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Every calendar day in the range, as YYYY-MM-DD, so charts have no gaps. */
export function listDays(range: ReportRange): string[] {
  const days: string[] = [];
  const cursor = new Date(`${range.from}T00:00:00.000Z`);
  const last = new Date(`${range.to}T00:00:00.000Z`);
  while (cursor.getTime() <= last.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}