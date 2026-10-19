import { prisma } from "../../database/prisma";
import { recordAuditLog } from "../../common/audit-log";
import type { UpdateSettingsInput } from "@muzammil-pos/validation";

/**
 * Settings is a singleton table: one row for the whole shop. If somehow no row
 * exists yet, create the same defaults the seed script uses instead of crashing.
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

interface EditableSettings {
  shopName: string;
  receiptHeader: string | null;
  receiptFooter: string | null;
  taxPercent: number;
  lowStockThreshold: number;
}

function editable(s: EditableSettings): EditableSettings {
  return {
    shopName: s.shopName,
    receiptHeader: s.receiptHeader,
    receiptFooter: s.receiptFooter,
    taxPercent: s.taxPercent,
    lowStockThreshold: s.lowStockThreshold,
  };
}

export async function updateSettings(input: UpdateSettingsInput, userId: string) {
  const current = await getSettings();

  const next: EditableSettings = {
    shopName: input.shopName.trim(),
    receiptHeader: input.receiptHeader.trim() || null,
    receiptFooter: input.receiptFooter.replace(/\r\n/g, "\n").trim() || null,
    taxPercent: Math.round(input.taxPercent * 100) / 100,
    lowStockThreshold: input.lowStockThreshold,
  };

  // Saving without changing anything writes nothing and leaves no audit entry.
  if (JSON.stringify(editable(current)) === JSON.stringify(next)) return current;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.settings.update({ where: { id: current.id }, data: next });

    await recordAuditLog(tx, {
      userId,
      action: "SETTINGS_UPDATED",
      entity: "Settings",
      entityId: current.id,
      oldData: { ...editable(current) },
      newData: { ...editable(updated) },
    });

    return updated;
  });
}