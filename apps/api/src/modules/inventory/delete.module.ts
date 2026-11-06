import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { requireAuth, requireRole } from "../../common/auth-guard.middleware";
import { requireParam } from "../../common/request-params";
import { Errors } from "../../common/errors";
import { deleteProductForever, deleteVariantForever } from "./delete.service";

/** Mounted BEFORE the old inventory router, so these two DELETE routes replace the old blocked ones. */
export const inventoryDeleteRouter = Router();

inventoryDeleteRouter.delete(
  "/products/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw Errors.sessionExpired();
    await deleteProductForever(requireParam(req, "id"), req.user.id);
    res.status(204).end();
  })
);

inventoryDeleteRouter.delete(
  "/products/:productId/variants/:variantId",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw Errors.sessionExpired();
    await deleteVariantForever(requireParam(req, "productId"), requireParam(req, "variantId"), req.user.id);
    res.status(204).end();
  })
);