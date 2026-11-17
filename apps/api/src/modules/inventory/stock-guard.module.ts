import { Router } from "express";
import { requireAuth } from "../../common/auth-guard.middleware";
import { Errors } from "../../common/errors";

/** Mounted before the old inventory router. It only blocks; everything else passes through. */
export const inventoryStockGuardRouter = Router();

inventoryStockGuardRouter.post("/products/:productId/variants", requireAuth, (req, _res, next) => {
  if (Number(req.body?.quantity ?? 0) > 0) {
    return next(
      Errors.validation(
        "A new size/color starts with 0 pieces here. To add stock, enter a supplier and the price per piece, or record a stock bill in Suppliers.",
        { field: "quantity" }
      )
    );
  }
  next();
});

inventoryStockGuardRouter.patch("/products/:productId/variants/:variantId", requireAuth, (req, _res, next) => {
  if (req.body && req.body.quantity !== undefined) {
    return next(
      Errors.validation(
        "Stock can't be edited directly. Add stock with a supplier bill; it goes down when you sell it.",
        { field: "quantity" }
      )
    );
  }
  next();
});