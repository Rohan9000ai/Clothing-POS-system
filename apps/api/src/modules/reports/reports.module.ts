import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { validate } from "../../common/validate.middleware";
import { requireAuth, requireRole } from "../../common/auth-guard.middleware";
import { reportQuerySchema } from "@muzammil-pos/validation";
import {
  getSalesReportHandler,
  getExpenseReportHandler,
  getFinancialReportHandler,
} from "./reports.controller";

export const reportsRouter = Router();

// Reports show every sale, expense and profit figure, so they are admin-only.
reportsRouter.use(requireAuth, requireRole("ADMIN"));

reportsRouter.get("/sales", validate(reportQuerySchema, "query"), asyncHandler(getSalesReportHandler));
reportsRouter.get("/expenses", validate(reportQuerySchema, "query"), asyncHandler(getExpenseReportHandler));
reportsRouter.get("/financial", validate(reportQuerySchema, "query"), asyncHandler(getFinancialReportHandler));