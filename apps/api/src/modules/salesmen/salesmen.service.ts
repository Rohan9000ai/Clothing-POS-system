import { prisma } from "../../database/prisma";
import { Errors } from "../../common/errors";
import type {
  CreateSalesmanInput,
  UpdateSalesmanInput,
  ToggleSalesmanStatusInput,
} from "@muzammil-pos/validation";

const SALESMAN_INCLUDE = {
  user: { select: { id: true, username: true, fullName: true, status: true } },
} as const;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Sum of netTotal + count of COMPLETED sales for each salesman, for today only. */
async function getTodaySalesBySalesman(): Promise<Map<string, { amount: number; count: number }>> {
  const todaySales = await prisma.sale.findMany({
    where: {
      salesmanId: { not: null },
      saleStatus: "COMPLETED",
      saleDate: { gte: startOfToday(), lte: endOfToday() },
    },
    select: { salesmanId: true, netTotal: true },
  });

  const map = new Map<string, { amount: number; count: number }>();
  for (const sale of todaySales) {
    if (!sale.salesmanId) continue;
    const existing = map.get(sale.salesmanId) ?? { amount: 0, count: 0 };
    existing.amount += sale.netTotal;
    existing.count += 1;
    map.set(sale.salesmanId, existing);
  }
  return map;
}

async function validateUserLink(userId: string, excludeSalesmanId?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.notFound("User", userId);
  if (user.role !== "CASHIER") throw Errors.userMustBeCashierToLink(user.username);

  const existingLink = await prisma.salesman.findUnique({ where: { userId } });
  if (existingLink && existingLink.id !== excludeSalesmanId) {
    throw Errors.userAlreadyLinkedToSalesman(user.username);
  }
}

export async function listSalesmen(status?: string) {
  const [salesmen, todaySalesMap] = await Promise.all([
    prisma.salesman.findMany({
      where: status ? { status } : undefined,
      orderBy: { name: "asc" },
      include: SALESMAN_INCLUDE,
    }),
    getTodaySalesBySalesman(),
  ]);

  return salesmen.map((s) => ({
    ...s,
    todaySales: todaySalesMap.get(s.id)?.amount ?? 0,
    todaySalesCount: todaySalesMap.get(s.id)?.count ?? 0,
  }));
}

export async function getSalesmanById(id: string) {
  const salesman = await prisma.salesman.findUnique({ where: { id }, include: SALESMAN_INCLUDE });
  if (!salesman) throw Errors.notFound("Salesman", id);

  const todaySalesMap = await getTodaySalesBySalesman();
  return {
    ...salesman,
    todaySales: todaySalesMap.get(id)?.amount ?? 0,
    todaySalesCount: todaySalesMap.get(id)?.count ?? 0,
  };
}

export async function createSalesman(input: CreateSalesmanInput) {
  if (input.userId) {
    await validateUserLink(input.userId);
  }

  return prisma.salesman.create({
    data: {
      name: input.name,
      phone: input.phone,
      cnic: input.cnic,
      joinDate: new Date(input.joinDate),
      salary: input.salary,
      userId: input.userId ?? null,
      status: "ACTIVE",
    },
    include: SALESMAN_INCLUDE,
  });
}

export async function updateSalesman(id: string, input: UpdateSalesmanInput) {
  const salesman = await prisma.salesman.findUnique({ where: { id } });
  if (!salesman) throw Errors.notFound("Salesman", id);

  if (input.userId !== undefined && input.userId !== null) {
    await validateUserLink(input.userId, id);
  }

  return prisma.salesman.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.cnic !== undefined ? { cnic: input.cnic } : {}),
      ...(input.joinDate !== undefined ? { joinDate: new Date(input.joinDate) } : {}),
      ...(input.salary !== undefined ? { salary: input.salary } : {}),
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
    },
    include: SALESMAN_INCLUDE,
  });
}

export async function toggleSalesmanStatus(id: string, input: ToggleSalesmanStatusInput) {
  const salesman = await prisma.salesman.findUnique({ where: { id } });
  if (!salesman) throw Errors.notFound("Salesman", id);
  return prisma.salesman.update({
    where: { id },
    data: { status: input.status },
    include: SALESMAN_INCLUDE,
  });
}

export async function deleteSalesman(id: string) {
  const salesman = await prisma.salesman.findUnique({ where: { id } });
  if (!salesman) throw Errors.notFound("Salesman", id);

  const [saleCount, expenseCount] = await Promise.all([
    prisma.sale.count({ where: { salesmanId: id } }),
    prisma.expense.count({ where: { salesmanId: id } }),
  ]);

  if (saleCount > 0 || expenseCount > 0) {
    throw Errors.salesmanHasRelatedRecords(salesman.name);
  }

  await prisma.salesman.delete({ where: { id } });
  return { success: true };
}