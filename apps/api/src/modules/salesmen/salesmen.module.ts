import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { validate } from "../../common/validate.middleware";
import { requireAuth, requireRole } from "../../common/auth-guard.middleware";
import {
  createSalesmanSchema,
  updateSalesmanSchema,
  toggleSalesmanStatusSchema,
} from "@muzammil-pos/validation";
import {
  getSalesmen,
  getSalesman,
  postSalesman,
  patchSalesman,
  patchSalesmanStatus,
  deleteSalesmanHandler,
} from "./salesmen.controller";

export const salesmenRouter = Router();

salesmenRouter.use(requireAuth);

// Read open to any authenticated user (Cashier POS dropdown needs this); writes admin-only.
salesmenRouter.get("/", asyncHandler(getSalesmen));
salesmenRouter.get("/:id", asyncHandler(getSalesman));
salesmenRouter.post("/", requireRole("ADMIN"), validate(createSalesmanSchema), asyncHandler(postSalesman));
salesmenRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  validate(updateSalesmanSchema),
  asyncHandler(patchSalesman)
);
salesmenRouter.patch(
  "/:id/status",
  requireRole("ADMIN"),
  validate(toggleSalesmanStatusSchema),
  asyncHandler(patchSalesmanStatus)
);
salesmenRouter.delete("/:id", requireRole("ADMIN"), asyncHandler(deleteSalesmanHandler));