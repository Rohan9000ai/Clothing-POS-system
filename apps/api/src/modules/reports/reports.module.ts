import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { validate } from "../../common/validate.middleware";
import { requireAuth, requireRole } from "../../common/auth-guard.middleware";
import {
  reportQuerySchema,
  stockReportQuerySchema,
  snapshotReportQuerySchema,
} from "@muzammil-pos/validation";
import {
  getSalesReportHandler,
  getExpenseReportHandler,
  getFinancialReportHandler,
  getStockReportHandler,
  getReceivablesReportHandler,
  getPayablesReportHandler,
} from "./reports.controller";

export const reportsRouter = Router();

// Reports show every sale, expense, stock value and balance, so they are admin-only.
reportsRouter.use(requireAuth, requireRole("ADMIN"));

reportsRouter.get("/sales", validate(reportQuerySchema, "query"), asyncHandler(getSalesReportHandler));
reportsRouter.get("/expenses", validate(reportQuerySchema, "query"), asyncHandler(getExpenseReportHandler));
reportsRouter.get("/financial", validate(reportQuerySchema, "query"), asyncHandler(getFinancialReportHandler));
reportsRouter.get("/stock", validate(stockReportQuerySchema, "query"), asyncHandler(getStockReportHandler));
reportsRouter.get(
  "/receivables",
  validate(snapshotReportQuerySchema, "query"),
  asyncHandler(getReceivablesReportHandler)
);
reportsRouter.get("/payables", validate(snapshotReportQuerySchema, "query"), asyncHandler(getPayablesReportHandler));