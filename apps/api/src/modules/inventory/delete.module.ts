import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { requireAuth, requireRole } from "../../common/auth-guard.middleware";
import { confirmAdminPassword } from "../../common/confirm-password";
import { requireParam } from "../../common/request-params";
import { Errors } from "../../common/errors";
import { deleteProductForever, deleteVariantForever } from "./delete.service";

/** Mounted BEFORE the old inventory router, so these two DELETE routes replace the old blocked ones. */
export const inventoryDeleteRouter = Router();

inventoryDeleteRouter.delete(
  "/products/:id",
  requireAuth,
  requireRole("ADMIN"),
  confirmAdminPassword,
  asyncHandler(async (req, res) => {
    if (!req.user) throw Errors.sessionExpired();
    await deleteProductForever(requireParam(req, "id"), req.user.id);
    res.status(200).json({ success: true });
  })
);

inventoryDeleteRouter.delete(
  "/products/:productId/variants/:variantId",
  requireAuth,
  requireRole("ADMIN"),
  confirmAdminPassword,
  asyncHandler(async (req, res) => {
    if (!req.user) throw Errors.sessionExpired();
    // The reply carries the sizes that are really left, so the screen always shows the truth.
    const variants = await deleteVariantForever(
      requireParam(req, "productId"),
      requireParam(req, "variantId"),
      req.user.id
    );
    res.status(200).json({ success: true, variants });
  })
);