/**
 * Prices in this shop already include tax. Given a bill total (paisa) and the
 * tax rate in percent, this is the part of the total that is tax:
 * total × rate ÷ (100 + rate).
 */
export function taxIncludedAmount(totalPaisa: number, taxPercent: number): number {
  if (!(taxPercent > 0) || !(totalPaisa > 0)) return 0;
  return Math.round((totalPaisa * taxPercent) / (100 + taxPercent));
}

/** 18 becomes "18%", 17.5 becomes "17.5%". */
export function formatTaxPercent(taxPercent: number): string {
  return `${Number(taxPercent.toFixed(2))}%`;
}