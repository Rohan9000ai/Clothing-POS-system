import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { validate } from "../../common/validate.middleware";
import { requireAuth, requireRole } from "../../common/auth-guard.middleware";
import { createUserSchema } from "@muzammil-pos/validation";
import { getUsers, postUser } from "./users.controller";

export const usersRouter = Router();

// Admin-only: list and register users/cashiers (see docs/architecture/coding-standards.md
// "Definition of done" — role-gated per task requirement).
usersRouter.get("/", requireAuth, requireRole("ADMIN"), asyncHandler(getUsers));
usersRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  validate(createUserSchema),
  asyncHandler(postUser)
);