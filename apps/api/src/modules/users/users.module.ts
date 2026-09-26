import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { validate } from "../../common/validate.middleware";
import { requireAuth, requireRole } from "../../common/auth-guard.middleware";
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  toggleUserStatusSchema,
} from "@muzammil-pos/validation";
import {
  getUsers,
  getUser,
  postUser,
  patchUser,
  patchUserPassword,
  patchUserStatus,
  deleteUserHandler,
} from "./users.controller";

export const usersRouter = Router();

// All user management is admin-only.
usersRouter.use(requireAuth, requireRole("ADMIN"));

usersRouter.get("/", asyncHandler(getUsers));
usersRouter.get("/:id", asyncHandler(getUser));
usersRouter.post("/", validate(createUserSchema), asyncHandler(postUser));
usersRouter.patch("/:id", validate(updateUserSchema), asyncHandler(patchUser));
usersRouter.patch("/:id/password", validate(changePasswordSchema), asyncHandler(patchUserPassword));
usersRouter.patch("/:id/status", validate(toggleUserStatusSchema), asyncHandler(patchUserStatus));
usersRouter.delete("/:id", asyncHandler(deleteUserHandler));