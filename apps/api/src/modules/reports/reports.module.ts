import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { validate } from "../../common/validate.middleware";
import { requireAuth, requireRole } from "../../common/auth-guard.middleware";
import { notImplemented } from "../../common/not-implemented";
import { salesReportQuerySchema } from "@muzammil-pos/validation";
import { getSalesReportHandler } from "./reports.controller";

export const reportsRouter = Router();

// Reports show every sale and every cashier's totals, so they are admin-only.
reportsRouter.use(requireAuth, requireRole("ADMIN"));

reportsRouter.get("/sales", validate(salesReportQuerySchema, "query"), asyncHandler(getSalesReportHandler));

// Expenses, stock and profit/loss reports arrive on their own build days.
reportsRouter.get("/financial", notImplemented("reports"));