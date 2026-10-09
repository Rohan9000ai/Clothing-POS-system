import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { validate } from "../../common/validate.middleware";
import { requireAuth, requireRole } from "../../common/auth-guard.middleware";
import {
  createSupplierSchema,
  updateSupplierSchema,
  toggleSupplierStatusSchema,
  createSupplierTransactionSchema,
  createSupplierPurchaseSchema,
  voidSupplierPurchaseSchema,
} from "@muzammil-pos/validation";
import {
  getSuppliers,
  getSupplier,
  postSupplier,
  patchSupplier,
  patchSupplierStatus,
  deleteSupplierHandler,
  postSupplierTransaction,
  getSupplierTransactions,
} from "./suppliers.controller";
import {
  getSupplierPurchases,
  postSupplierPurchase,
  postVoidSupplierPurchase,
} from "./purchases.controller";

export const suppliersRouter = Router();

suppliersRouter.use(requireAuth);

// Read open to any authenticated user; all writes admin-only.
suppliersRouter.get("/", asyncHandler(getSuppliers));
suppliersRouter.get("/:id", asyncHandler(getSupplier));
suppliersRouter.post("/", requireRole("ADMIN"), validate(createSupplierSchema), asyncHandler(postSupplier));
suppliersRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  validate(updateSupplierSchema),
  asyncHandler(patchSupplier)
);
suppliersRouter.patch(
  "/:id/status",
  requireRole("ADMIN"),
  validate(toggleSupplierStatusSchema),
  asyncHandler(patchSupplierStatus)
);
suppliersRouter.delete("/:id", requireRole("ADMIN"), asyncHandler(deleteSupplierHandler));

suppliersRouter.get("/:id/transactions", asyncHandler(getSupplierTransactions));
suppliersRouter.post(
  "/:id/transactions",
  requireRole("ADMIN"),
  validate(createSupplierTransactionSchema),
  asyncHandler(postSupplierTransaction)
);

// Stock purchase bills (pieces, sizes, colors, price per piece)
suppliersRouter.get("/:id/purchases", asyncHandler(getSupplierPurchases));
suppliersRouter.post(
  "/:id/purchases",
  requireRole("ADMIN"),
  validate(createSupplierPurchaseSchema),
  asyncHandler(postSupplierPurchase)
);
suppliersRouter.post(
  "/:id/purchases/:purchaseId/void",
  requireRole("ADMIN"),
  validate(voidSupplierPurchaseSchema),
  asyncHandler(postVoidSupplierPurchase)
);