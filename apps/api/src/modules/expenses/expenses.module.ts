import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { validate } from "../../common/validate.middleware";
import { requireAuth, requireRole } from "../../common/auth-guard.middleware";
import { createExpenseSchema, updateExpenseSchema, voidExpenseSchema } from "@muzammil-pos/validation";
import {
  getExpenses,
  getExpense,
  postExpense,
  patchExpense,
  postVoidExpense,
} from "./expenses.controller";

export const expensesRouter = Router();

// Expenses are an admin-only concern end-to-end — no cashier read access,
// unlike inventory/sales which cashiers need for billing.
expensesRouter.use(requireAuth, requireRole("ADMIN"));

expensesRouter.get("/", asyncHandler(getExpenses));
expensesRouter.get("/:id", asyncHandler(getExpense));
expensesRouter.post("/", validate(createExpenseSchema), asyncHandler(postExpense));
expensesRouter.patch("/:id", validate(updateExpenseSchema), asyncHandler(patchExpense));
expensesRouter.post("/:id/void", validate(voidExpenseSchema), asyncHandler(postVoidExpense));