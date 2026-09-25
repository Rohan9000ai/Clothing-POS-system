import argon2 from "argon2";
import { prisma } from "../../database/prisma";
import { Errors } from "../../common/errors";
import type { CreateUserInput } from "@muzammil-pos/validation";

const SAFE_USER_SELECT = {
  id: true,
  fullName: true,
  username: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: SAFE_USER_SELECT,
  });
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