import argon2 from "argon2";
import { prisma } from "../../database/prisma";
import { Errors } from "../../common/errors";
import { signToken } from "../../common/jwt";
import type { LoginInput } from "@muzammil-pos/validation";

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { username: input.username } });

  if (!user) {
    throw Errors.invalidCredentials();
  }
  if (user.status !== "ACTIVE") {
    throw Errors.inactiveUser();
  }

  const passwordValid = await argon2.verify(user.passwordHash, input.password);
  if (!passwordValid) {
    throw Errors.invalidCredentials();
  }

  const token = signToken({
    sub: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
  });

  return {
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
      status: user.status,
    },
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "ACTIVE") {
    throw Errors.sessionExpired();
  }
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    role: user.role,
    status: user.status,
  };
}