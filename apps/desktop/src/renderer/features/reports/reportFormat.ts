import type { SalePaymentMethod } from "@muzammil-pos/types";

export function ymdToUtcDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** Formats a YYYY-MM-DD day in UTC, so the day shown is always the day stored. */
function makeFormatter(options: Intl.DateTimeFormatOptions) {
  const formatter = new Intl.DateTimeFormat("en-PK", { ...options, timeZone: "UTC" });
  return (ymd: string): string => {
    const date = ymdToUtcDate(ymd);
    return Number.isNaN(date.getTime()) ? ymd : formatter.format(date);
  };
}

export const formatDayFull = makeFormatter({ weekday: "short", day: "numeric", month: "short", year: "numeric" });
export const formatDayMedium = makeFormatter({ day: "numeric", month: "short", year: "numeric" });
export const formatDayShort = makeFormatter({ day: "numeric", month: "short" });
export const formatMonthLong = makeFormatter({ month: "long", year: "numeric" });
export const formatMonthShort = makeFormatter({ month: "short" });

const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** Short axis labels such as "6K" or "1.2M". Input is paisa. */
export function formatCompactMoney(paisa: number): string {
  return compactNumber.format(paisa / 100);
}

export function plural(count: number, one: string, many: string = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function formatPercentChange(change: number | null): string {
  if (change === null) return "—";
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  return `${sign}${Math.abs(change)}%`;
}

export interface ChangeDescription {
  text: string;
  tone: "good" | "bad" | "neutral";
  direction: "up" | "down" | "flat" | "none";
}

/** `increaseIsGood` is true for sales, false for expenses. */
export function describeChange(
  change: number | null,
  increaseIsGood: boolean,
  compareLabel: string
): ChangeDescription {
  if (change === null) return { text: "No earlier data to compare", tone: "neutral", direction: "none" };
  if (change === 0) return { text: `No change ${compareLabel}`, tone: "neutral", direction: "flat" };
  const good = change > 0 === increaseIsGood;
  return {
    text: `${formatPercentChange(change)} ${compareLabel}`,
    tone: good ? "good" : "bad",
    direction: change > 0 ? "up" : "down",
  };
}

export const SALE_METHOD_LABELS: Record<SalePaymentMethod, string> = {
  CASH: "Cash",
  EASYPAISA: "Easypaisa",
  JAZZCASH: "JazzCash",
  BANK_TRANSFER: "Bank transfer",
};