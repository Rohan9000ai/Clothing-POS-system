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

  const where = {
    ...(query.search ? { title: { contains: query.search } } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(Object.keys(expenseDateFilter).length > 0 ? { expenseDate: expenseDateFilter } : {}),
  };

  const [items, totalItems] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: EXPENSE_INCLUDE,
      orderBy: { expenseDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    items,
    meta: { page, pageSize, totalItems, totalPages: Math.max(Math.ceil(totalItems / pageSize), 1) },
  };
}

export async function getExpenseById(id: string) {
  const expense = await prisma.expense.findUnique({ where: { id }, include: EXPENSE_INCLUDE });
  if (!expense) throw Errors.notFound("Expense", id);
  return expense;
}

export async function createExpense(input: CreateExpenseInput, createdById: string) {
  if (input.supplierId) await assertSupplierLinkable(input.supplierId);
  if (input.salesmanId) await assertSalesmanLinkable(input.salesmanId);

  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        expenseDate: new Date(input.expenseDate),
        title: input.title ?? defaultTitleFor(input.type),
        type: input.type,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        referenceNo: input.referenceNo ?? null,
        supplierId: input.supplierId ?? null,
        salesmanId: input.salesmanId ?? null,
        notes: input.notes ?? null,
        createdById,
        status: "ACTIVE",
      },
      include: EXPENSE_INCLUDE,
    });

    await recordAuditLog(tx, {
      userId: createdById,
      action: "EXPENSE_CREATED",
      entity: "Expense",
      entityId: expense.id,
      newData: { type: expense.type, amount: expense.amount, title: expense.title },
    });

    return expense;
  });
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

export async function updateExpense(id: string, input: UpdateExpenseInput) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw Errors.notFound("Expense", id);

  if (input.supplierId) await assertSupplierLinkable(input.supplierId);
  if (input.salesmanId) await assertSalesmanLinkable(input.salesmanId);

  return prisma.expense.update({
    where: { id },
    data: {
      ...(input.expenseDate !== undefined ? { expenseDate: new Date(input.expenseDate) } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}),
      ...(input.referenceNo !== undefined ? { referenceNo: input.referenceNo } : {}),
      ...(input.supplierId !== undefined ? { supplierId: input.supplierId } : {}),
      ...(input.salesmanId !== undefined ? { salesmanId: input.salesmanId } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: EXPENSE_INCLUDE,
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
      },
      include: EXPENSE_INCLUDE,
    });

    await recordAuditLog(tx, {
      userId: voidedById,
      action: "EXPENSE_VOIDED",
      entity: "Expense",
      entityId: expense.id,
      oldData: { status: "ACTIVE" },
      newData: { status: "VOID", reason: input.reason },
    });

    return updated;
  });
}