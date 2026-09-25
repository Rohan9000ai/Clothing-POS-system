/**
 * All money in the database and API is stored as an integer in PAISA
 * (smallest currency unit) — see docs/database/schema.md "Day 2 addendum".
 * These are the ONLY functions that should convert between paisa and rupees.
 */

export function toPaisa(rupees: number): number {
  return Math.round(rupees * 100);
}

export function fromPaisa(paisa: number): number {
  return paisa / 100;
}

export function formatCurrency(paisa: number, currency: string = "PKR"): string {
  const rupees = fromPaisa(paisa);
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/** Formats without the currency symbol, e.g. for compact table cells: "1,250" */
export function formatNumber(paisa: number): string {
  const rupees = fromPaisa(paisa);
  return new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 2,
  }).format(rupees);
}