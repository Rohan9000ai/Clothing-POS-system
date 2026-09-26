import argon2 from "argon2";
import { prisma } from "../../database/prisma";
import { Errors } from "../../common/errors";
import type {
  CreateUserInput,
  UpdateUserInput,
  ChangePasswordInput,
  ToggleUserStatusInput,
} from "@muzammil-pos/validation";

const SAFE_USER_SELECT = {
  id: true,
  fullName: true,
  username: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function countActiveAdmins(excludeUserId?: string): Promise<number> {
  return prisma.user.count({
    where: {
      role: "ADMIN",
      status: "ACTIVE",
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: SAFE_USER_SELECT,
  });
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });
  if (!user) {
    throw Errors.notFound("User", id);
  }
  return user;
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { username: input.username } });
  if (existing) {
    throw Errors.validation(`Username "${input.username}" is already taken.`, {
      field: "username",
    });
  }

  const passwordHash = await argon2.hash(input.password);

  return prisma.user.create({
    data: {
      fullName: input.fullName,
      username: input.username,
      passwordHash,
      role: input.role,
      status: "ACTIVE",
    },
    select: SAFE_USER_SELECT,
  });
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw Errors.notFound("User", id);
  }

  // Guard: don't let the last active admin be demoted to CASHIER.
  if (input.role === "CASHIER" && user.role === "ADMIN" && user.status === "ACTIVE") {
    const remainingAdmins = await countActiveAdmins(id);
    if (remainingAdmins === 0) {
      throw Errors.cannotRemoveLastAdmin();
    }
  }

  return prisma.user.update({
    where: { id },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
    },
    select: SAFE_USER_SELECT,
  });
}

export async function changeUserPassword(id: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw Errors.notFound("User", id);
  }

  const passwordHash = await argon2.hash(input.newPassword);

  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  return { success: true };
}

export async function toggleUserStatus(id: string, input: ToggleUserStatusInput) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw Errors.notFound("User", id);
  }

  // Guard: don't let the last active admin be deactivated.
  if (input.status === "INACTIVE" && user.role === "ADMIN" && user.status === "ACTIVE") {
    const remainingAdmins = await countActiveAdmins(id);
    if (remainingAdmins === 0) {
      throw Errors.cannotRemoveLastAdmin();
    }
  }

  return prisma.user.update({
    where: { id },
    data: { status: input.status },
    select: SAFE_USER_SELECT,
  });
}

export async function deleteUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw Errors.notFound("User", id);
  }

  // Guard: don't let the last active admin be deleted.
  if (user.role === "ADMIN" && user.status === "ACTIVE") {
    const remainingAdmins = await countActiveAdmins(id);
    if (remainingAdmins === 0) {
      throw Errors.cannotRemoveLastAdmin();
    }
  }

  // Guard: a user referenced by sales/expenses/etc. can't be hard-deleted —
  // deleting them would corrupt historical records (see coding-standards.md,
  // "soft status fields instead of hard deletes for anything referenced elsewhere").
  const [salesAsCashier, expensesCreated, supplierTxnsCreated, inventoryMovements, auditLogs] =
    await Promise.all([
      prisma.sale.count({ where: { cashierId: id } }),
      prisma.expense.count({ where: { createdById: id } }),
      prisma.supplierTransaction.count({ where: { createdById: id } }),
      prisma.inventoryMovement.count({ where: { createdById: id } }),
      prisma.auditLog.count({ where: { userId: id } }),
    ]);

  const hasRelatedRecords =
    salesAsCashier + expensesCreated + supplierTxnsCreated + inventoryMovements + auditLogs > 0;

  if (hasRelatedRecords) {
    throw Errors.userHasRelatedRecords(user.username);
  }

  await prisma.user.delete({ where: { id } });
  return { success: true };
}