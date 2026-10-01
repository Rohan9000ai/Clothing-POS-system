/**
 * Shared audit logging helper, writing to the audit_logs table (see
 * docs/database/schema.md). Any module that creates, edits, voids, or
 * deletes something significant should call this — sales today, with
 * expenses/suppliers/users following the same pattern on their own build days.
 *
 * Accepts either the main Prisma client or a transaction client ($transaction
 * callback's `tx`), so the audit entry can be written inside the SAME
 * transaction as the action it's recording — the log and the action always
 * succeed or fail together, never one without the other.
 */

import type { PrismaClient, Prisma } from "@prisma/client";

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

export interface AuditLogEntry {
  userId: string;
  action: string; // e.g. "SALE_CREATED", "SALE_VOIDED"
  entity: string; // e.g. "Sale"
  entityId: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}

export async function recordAuditLog(client: PrismaClientOrTx, entry: AuditLogEntry) {
  await client.auditLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      oldData: entry.oldData ? JSON.stringify(entry.oldData) : null,
      newData: entry.newData ? JSON.stringify(entry.newData) : null,
    },
  });
}