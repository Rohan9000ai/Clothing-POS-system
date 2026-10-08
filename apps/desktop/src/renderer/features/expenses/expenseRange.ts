export type RangePreset = "day" | "week" | "month" | "custom";

/** Calendar dates as YYYY-MM-DD strings. Either end may be open (undefined). */
export interface DateRange {
  from?: string;
  to?: string;
}

/**
 * Local calendar date as YYYY-MM-DD. Deliberately NOT toISOString(), which
 * converts to UTC and shifts the date by a day in the early hours of the
 * morning in Pakistan (UTC+5).
 */
export function toLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function resolveRange(
  preset: RangePreset,
  customFrom: string,
  customTo: string,
  now: Date = new Date()
): DateRange {
  if (preset === "day") {
    const today = toLocalYmd(now);
    return { from: today, to: today };
  }

  if (preset === "week") {
    // Monday to Sunday of the current week.
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { from: toLocalYmd(start), to: toLocalYmd(end) };
  }

  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toLocalYmd(start), to: toLocalYmd(end) };
  }

  const from = customFrom || undefined;
  const to = customTo || undefined;
  // Forgive reversed dates instead of showing an error.
  if (from && to && from > to) return { from: to, to: from };
  return { from, to };
}

// Expense dates are stored as the chosen calendar day at UTC midnight, so they
// must be formatted in UTC to show the same day that was entered.
const dayFormatter = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatExpenseDate(iso: string): string {
  return dayFormatter.format(new Date(iso));
}

function formatYmd(ymd: string): string {
  return dayFormatter.format(new Date(`${ymd}T00:00:00.000Z`));
}

export function describeRange(range: DateRange): string {
  if (range.from && range.to) {
    return range.from === range.to ? formatYmd(range.from) : `${formatYmd(range.from)} – ${formatYmd(range.to)}`;
  }
  if (range.from) return `From ${formatYmd(range.from)}`;
  if (range.to) return `Up to ${formatYmd(range.to)}`;
  return "All dates";
}