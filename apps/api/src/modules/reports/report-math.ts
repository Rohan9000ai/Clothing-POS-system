/** Shared arithmetic for the report services. */

/** Share of a total, as a percentage with one decimal. 0 when the total is 0. */
export function percentOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

/**
 * How much `current` changed compared with `previous`, in percent.
 * null when `previous` is 0, because a percentage cannot be calculated from nothing.
 * Uses the size of `previous`, so moving from a loss to a profit reads as an increase.
 */
export function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

/** Profit as a percentage of sales. null when there were no sales. */
export function marginPercent(profit: number, sales: number): number | null {
  return sales > 0 ? Math.round((profit / sales) * 1000) / 10 : null;
}

export interface Bucket {
  amount: number;
  count: number;
}

export function addTo(map: Map<string, Bucket>, key: string, amount: number) {
  const bucket = map.get(key) ?? { amount: 0, count: 0 };
  bucket.amount += amount;
  bucket.count += 1;
  map.set(key, bucket);
}