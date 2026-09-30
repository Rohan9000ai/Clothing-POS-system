import { prisma } from "../../database/prisma";

/**
 * Settings is a singleton table — one row for the whole shop. This getter
 * is used by other modules (like low-stock queries) that need a setting
 * value before the full Settings module (with update/receipt-preview UI)
 * is built. If somehow no row exists yet, create the same defaults the
 * Day 2 seed script uses, rather than crashing.
 */
export async function getSettings() {
  const existing = await prisma.settings.findFirst();
  if (existing) return existing;

  return prisma.settings.create({
    data: {
      shopName: "Muzammil Store",
      currency: "PKR",
      receiptHeader: "Thank you for shopping at Muzammil Store",
      receiptFooter: "Exchange within 7 days with receipt",
      taxPercent: 0,
      lowStockThreshold: 5,
    },
  });
}