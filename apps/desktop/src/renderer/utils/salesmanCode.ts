/** The short ID shown for a salesman (the last 8 characters of the internal id). The Salesmen screen uses the same rule. */
export function salesmanCode(id: string): string {
  return id.slice(-8).toUpperCase();
}