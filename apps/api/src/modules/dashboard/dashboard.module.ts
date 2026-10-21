import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { requireAuth, requireRole } from "../../common/auth-guard.middleware";
import { getDashboardHandler } from "./dashboard.controller";

export const dashboardRouter = Router();

// The dashboard shows takings, expenses and stock for the whole shop, so it is admin-only.
dashboardRouter.use(requireAuth, requireRole("ADMIN"));

dashboardRouter.get("/", asyncHandler(getDashboardHandler));