import { prisma } from "../../database/prisma";
import { Errors } from "../../common/errors";
import { recordAuditLog } from "../../common/audit-log";
import type { CreateExpenseInput, UpdateExpenseInput, VoidExpenseInput } from "@muzammil-pos/validation";
import type { PaginationQuery } from "@muzammil-pos/types";

const EXPENSE_INCLUDE = {
  supplier: { select: { id: true, name: true } },
  salesman: { select: { id: true, name: true } },
  createdBy: { select: { id: true, fullName: true, username: true } },
} as const;

async function assertSupplierLinkable(supplierId: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw Errors.notFound("Supplier", supplierId);
  if (supplier.status !== "ACTIVE") throw Errors.linkedRecordMustBeActive("Supplier", supplier.name);
}

async function assertSalesmanLinkable(salesmanId: string) {
  const salesman = await prisma.salesman.findUnique({ where: { id: salesmanId } });
  if (!salesman) throw Errors.notFound("Salesman", salesmanId);
  if (salesman.status !== "ACTIVE") throw Errors.linkedRecordMustBeActive("Salesman", salesman.name);
}

function defaultTitleFor(type: CreateExpenseInput["type"]): string {
  switch (type) {
    case "ELECTRICITY":
      return "Electricity bill";
    case "SALARIES":
      return "Salary payment";
    case "PAYOUTS":
      return "Payout";
    case "SUPPLIER_PAYMENT":
      return "Supplier payment";
    case "TAXES":
      return "Tax payment";
    default:
      return "Expense";
  }
}

/** Note shown on the supplier's ledger so it's clear where the payment came from. */
function paymentNotes(title: string, notes: string | null): string {
  return notes ? `Expense: ${title} — ${notes}` : `Expense: ${title}`;
}

interface ListExpensesQuery extends PaginationQuery {
  type?: string;
  paymentMethod?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function listExpenses(query: ListExpensesQuery) {
  const page = query.page && !Number.isNaN(query.page) ? query.page : 1;
  const pageSize = query.pageSize && !Number.isNaN(query.pageSize) ? query.pageSize : 20;

  const expenseDateFilter: { gte?: Date; lte?: Date } = {};
  if (query.dateFrom) expenseDateFilter.gte = new Date(query.dateFrom);
  if (query.dateTo) expenseDateFilter.lte = new Date(query.dateTo);

  // Filters shared by the list and the total. The status filter is applied
  // separately, because the total must always exclude voided expenses.
  const baseWhere = {
    ...(query.search ? { title: { contains: query.search } } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
    ...(Object.keys(expenseDateFilter).length > 0 ? { expenseDate: expenseDateFilter } : {}),
  };
  const where = { ...baseWhere, ...(query.status ? { status: query.status } : {}) };

  const [items, totalItems, activeAggregate] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: EXPENSE_INCLUDE,
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({
      where: { ...baseWhere, status: "ACTIVE" },
      _sum: { amount: true },
    }),
  ]);

  return {
    items,
    meta: { page, pageSize, totalItems, totalPages: Math.max(Math.ceil(totalItems / pageSize), 1) },
    summary: { activeTotal: activeAggregate._sum.amount ?? 0 },
  };
}

export async function getExpenseById(id: string) {
  const expense = await prisma.expense.findUnique({ where: { id }, include: EXPENSE_INCLUDE });
  if (!expense) throw Errors.notFound("Expense", id);
  return expense;
}

export async function createExpense(input: CreateExpenseInput, createdById: string) {
  if (input.type === "SUPPLIER_PAYMENT" && !input.supplierId) {
    throw Errors.supplierRequiredForPayment();
  }
  if (input.supplierId) await assertSupplierLinkable(input.supplierId);
  if (input.salesmanId) await assertSalesmanLinkable(input.salesmanId);

  const title = input.title?.trim() || defaultTitleFor(input.type);
  const notes = input.notes?.trim() || null;
  const referenceNo = input.referenceNo?.trim() || null;
  const expenseDate = new Date(input.expenseDate);

  // The expense, the supplier payment and the audit entries are saved together
  // or not at all, so the two sets of books can never disagree.
  return prisma.$transaction(async (tx) => {
    let supplierTransactionId: string | null = null;

    if (input.type === "SUPPLIER_PAYMENT" && input.supplierId) {
      const payment = await tx.supplierTransaction.create({
        data: {
          supplierId: input.supplierId,
          type: "PAYMENT",
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          referenceNo,
          notes: paymentNotes(title, notes),
          date: expenseDate,
          createdById,
        },
      });
      supplierTransactionId = payment.id;

      await recordAuditLog(tx, {
        userId: createdById,
        action: "SUPPLIER_TRANSACTION_CREATED",
        entity: "SupplierTransaction",
        entityId: payment.id,
        newData: { supplierId: input.supplierId, type: "PAYMENT", amount: input.amount, viaExpense: true },
      });
    }

    const expense = await tx.expense.create({
      data: {
        expenseDate,
        title,
        type: input.type,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        referenceNo,
        supplierId: input.supplierId ?? null,
        salesmanId: input.salesmanId ?? null,
        notes,
        createdById,
        status: "ACTIVE",
        supplierTransactionId,
      },
      include: EXPENSE_INCLUDE,
    });

    await recordAuditLog(tx, {
      userId: createdById,
      action: "EXPENSE_CREATED",
      entity: "Expense",
      entityId: expense.id,
      newData: { type: expense.type, amount: expense.amount, title: expense.title, supplierTransactionId },
    });

    return expense;
  });
}

export async function updateExpense(id: string, input: UpdateExpenseInput, updatedById: string) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw Errors.notFound("Expense", id);
  if (expense.status === "VOID") throw Errors.cannotEditVoidedExpense();

  // The values this expense will have once the update is applied.
  const finalType = input.type ?? expense.type;
  const finalTitle = input.title?.trim() || expense.title;
  const finalAmount = input.amount ?? expense.amount;
  const finalMethod = input.paymentMethod ?? expense.paymentMethod;
  const finalDate = input.expenseDate ? new Date(input.expenseDate) : expense.expenseDate;
  const finalReference =
    input.referenceNo !== undefined ? input.referenceNo.trim() || null : expense.referenceNo;
  const finalNotes = input.notes !== undefined ? input.notes.trim() || null : expense.notes;
  const finalSupplierId = input.supplierId !== undefined ? input.supplierId : expense.supplierId;
  const finalSalesmanId = input.salesmanId !== undefined ? input.salesmanId : expense.salesmanId;

  const isSupplierPayment = finalType === "SUPPLIER_PAYMENT";
  if (isSupplierPayment && !finalSupplierId) throw Errors.supplierRequiredForPayment();

  // Only a NEWLY chosen supplier/salesman must be active. An unchanged link to a
  // since-deactivated record must not block editing unrelated fields.
  if (finalSupplierId && finalSupplierId !== expense.supplierId) await assertSupplierLinkable(finalSupplierId);
  if (finalSalesmanId && finalSalesmanId !== expense.salesmanId) await assertSalesmanLinkable(finalSalesmanId);

  return prisma.$transaction(async (tx) => {
    let supplierTransactionId = expense.supplierTransactionId;
    let paymentIdToRemove: string | null = null;

    if (isSupplierPayment && finalSupplierId) {
      const paymentData = {
        supplierId: finalSupplierId,
        amount: finalAmount,
        paymentMethod: finalMethod,
        referenceNo: finalReference,
        notes: paymentNotes(finalTitle, finalNotes),
        date: finalDate,
      };

      if (supplierTransactionId) {
        // Keep the existing supplier payment in sync with the expense.
        await tx.supplierTransaction.update({ where: { id: supplierTransactionId }, data: paymentData });
        await recordAuditLog(tx, {
          userId: updatedById,
          action: "SUPPLIER_TRANSACTION_UPDATED",
          entity: "SupplierTransaction",
          entityId: supplierTransactionId,
          newData: { supplierId: finalSupplierId, amount: finalAmount, viaExpense: true },
        });
      } else {
        // An older expense that was never linked (or one just changed to this type):
        // create its supplier payment now. This needs an active supplier.
        const supplier = await tx.supplier.findUnique({ where: { id: finalSupplierId } });
        if (!supplier) throw Errors.notFound("Supplier", finalSupplierId);
        if (supplier.status !== "ACTIVE") throw Errors.linkedRecordMustBeActive("Supplier", supplier.name);

        const created = await tx.supplierTransaction.create({
          data: { ...paymentData, type: "PAYMENT", createdById: updatedById },
        });
        supplierTransactionId = created.id;
        await recordAuditLog(tx, {
          userId: updatedById,
          action: "SUPPLIER_TRANSACTION_CREATED",
          entity: "SupplierTransaction",
          entityId: created.id,
          newData: { supplierId: finalSupplierId, type: "PAYMENT", amount: finalAmount, viaExpense: true },
        });
      }
    } else if (supplierTransactionId) {
      // No longer a supplier payment: take its payment off the supplier's account.
      paymentIdToRemove = supplierTransactionId;
      supplierTransactionId = null;
    }

    const updated = await tx.expense.update({
      where: { id },
      data: {
        expenseDate: finalDate,
        title: finalTitle,
        type: finalType,
        amount: finalAmount,
        paymentMethod: finalMethod,
        referenceNo: finalReference,
        supplierId: finalSupplierId,
        salesmanId: finalSalesmanId,
        notes: finalNotes,
        supplierTransactionId,
      },
      include: EXPENSE_INCLUDE,
    });

    // Removed after the expense stops pointing at it.
    if (paymentIdToRemove) {
      await tx.supplierTransaction.deleteMany({ where: { id: paymentIdToRemove } });
      await recordAuditLog(tx, {
        userId: updatedById,
        action: "SUPPLIER_TRANSACTION_DELETED",
        entity: "SupplierTransaction",
        entityId: paymentIdToRemove,
        oldData: { supplierId: expense.supplierId, amount: expense.amount, viaExpense: true },
      });
    }

    await recordAuditLog(tx, {
      userId: updatedById,
      action: "EXPENSE_UPDATED",
      entity: "Expense",
      entityId: id,
      oldData: { type: expense.type, amount: expense.amount, supplierId: expense.supplierId },
      newData: { type: finalType, amount: finalAmount, supplierId: finalSupplierId },
    });

    return updated;
  });
}

export async function voidExpense(id: string, input: VoidExpenseInput, voidedById: string) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw Errors.notFound("Expense", id);
  if (expense.status === "VOID") throw Errors.expenseAlreadyVoided();

  return prisma.$transaction(async (tx) => {
    const voidedNote = `[VOIDED] ${input.reason}`;
    const updated = await tx.expense.update({
      where: { id },
      data: {
        status: "VOID",
        notes: expense.notes ? `${expense.notes}\n${voidedNote}` : voidedNote,
        supplierTransactionId: null,
      },
      include: EXPENSE_INCLUDE,
    });

    // Reverse the matching supplier payment so what is owed goes back up.
    // Allowed even if the supplier has since been deactivated.
    if (expense.supplierTransactionId) {
      await tx.supplierTransaction.deleteMany({ where: { id: expense.supplierTransactionId } });
      await recordAuditLog(tx, {
        userId: voidedById,
        action: "SUPPLIER_TRANSACTION_DELETED",
        entity: "SupplierTransaction",
        entityId: expense.supplierTransactionId,
        oldData: { supplierId: expense.supplierId, type: "PAYMENT", amount: expense.amount, viaExpense: true },
      });
    }

    await recordAuditLog(tx, {
      userId: voidedById,
      action: "EXPENSE_VOIDED",
      entity: "Expense",
      entityId: expense.id,
      oldData: { status: "ACTIVE" },
      newData: {
        status: "VOID",
        reason: input.reason,
        supplierPaymentRemoved: !!expense.supplierTransactionId,
      },
    });

    return updated;
  });
}