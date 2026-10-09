import type { Request, Response } from "express";
import { requireParam } from "../../common/request-params";
import { Errors } from "../../common/errors";
import { listSupplierPurchases, createSupplierPurchase, voidSupplierPurchase } from "./purchases.service";

export async function getSupplierPurchases(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const purchases = await listSupplierPurchases(id);
  res.status(200).json({ purchases });
}

export async function postSupplierPurchase(req: Request, res: Response) {
  const id = requireParam(req, "id");
  if (!req.user) throw Errors.sessionExpired();
  const purchase = await createSupplierPurchase(id, req.body, req.user.id);
  res.status(201).json({ purchase });
}

export async function postVoidSupplierPurchase(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const purchaseId = requireParam(req, "purchaseId");
  if (!req.user) throw Errors.sessionExpired();
  const purchase = await voidSupplierPurchase(id, purchaseId, req.body, req.user.id);
  res.status(200).json({ purchase });
}