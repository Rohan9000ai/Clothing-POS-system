import { prisma } from "../../database/prisma";

const WALK_IN_CUSTOMER_NAME = "Walk-in";

/**
 * One shared "Walk-in" customer record is used as the default for sales
 * where no specific customer is selected (see docs/database/schema.md,
 * customers.name default). Created once, on first use, if it doesn't exist.
 */
export async function getOrCreateWalkInCustomer() {
  const existing = await prisma.customer.findFirst({ where: { name: WALK_IN_CUSTOMER_NAME } });
  if (existing) return existing;

  return prisma.customer.create({
    data: { name: WALK_IN_CUSTOMER_NAME, status: "ACTIVE", openingBalance: 0 },
  });
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({ where: { id } });
}