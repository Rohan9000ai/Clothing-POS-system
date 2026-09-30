import type { Request, Response } from "express";
import { requireParam } from "../../common/request-params";
import { Errors } from "../../common/errors";
import {
  adjustStock,
  listVariantMovements,
  listLowStock,
  listActiveProductsForCashier,
} from "./stock.service";

export async function postStockAdjustment(req: Request, res: Response) {
  const variantId = requireParam(req, "variantId");
  if (!req.user) throw Errors.sessionExpired();
  const variant = await adjustStock(variantId, req.body, req.user.id);
  res.status(200).json({ variant });
}

export async function getVariantMovements(req: Request, res: Response) {
  const variantId = requireParam(req, "variantId");
  const movements = await listVariantMovements(variantId);
  res.status(200).json({ movements });
}

export async function getLowStock(_req: Request, res: Response) {
  const items = await listLowStock();
  res.status(200).json({ items });
}

export async function getCashierProducts(req: Request, res: Response) {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const products = await listActiveProductsForCashier(search);
  res.status(200).json({ products });
}