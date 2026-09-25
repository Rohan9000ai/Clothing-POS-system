/**
 * Internal code generators — NOT barcodes (see docs/database/schema.md,
 * "Future barcode readiness"). These are human-scannable-by-eye codes used
 * before barcode support exists.
 */

export function generateProductCode(sequenceNumber: number): string {
  return `PROD-${String(sequenceNumber).padStart(4, "0")}`;
}

export function generateVariantSku(productCode: string, size: string, color: string): string {
  const sizePart = size.toUpperCase().replace(/\s+/g, "");
  const colorPart = color.toUpperCase().slice(0, 3).replace(/\s+/g, "");
  return `${productCode}-${sizePart}-${colorPart}`;
}

export function generateBillNo(sequenceNumber: number): string {
  const year = new Date().getFullYear();
  return `MS-${year}-${String(sequenceNumber).padStart(5, "0")}`;
}