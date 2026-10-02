import { prisma } from "../../database/prisma";

export async function listSalesmen(status?: string) {
  return prisma.salesman.findMany({
    where: status ? { status } : undefined,
    orderBy: { name: "asc" },
  });
}