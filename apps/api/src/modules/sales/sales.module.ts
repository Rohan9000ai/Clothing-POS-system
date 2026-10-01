import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { validate } from "../../common/validate.middleware";
import { requireAuth, requireRole } from "../../common/auth-guard.middleware";
import { createSaleSchema, voidSaleSchema } from "@muzammil-pos/validation";
import { postSale, getSale, postVoidSale, getSales } from "./sales.controller";

export const salesRouter = Router();

// Both roles can create and view sales — a cashier bills, an admin
// supervises/reviews from the Sales screen.
salesRouter.use(requireAuth, requireRole("ADMIN", "CASHIER"));

salesRouter.get("/", asyncHandler(getSales));
salesRouter.get("/:id", asyncHandler(getSale));
salesRouter.post("/", validate(createSaleSchema), asyncHandler(postSale));

// Voiding is a correction tool, restricted to admins — a cashier shouldn't
// be able to erase their own completed sale unsupervised.
salesRouter.post(
  "/:id/void",
  requireRole("ADMIN"),
  validate(voidSaleSchema),
  asyncHandler(postVoidSale)
);