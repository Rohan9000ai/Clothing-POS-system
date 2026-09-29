import type { Request, Response } from "express";
import { requireParam } from "../../common/request-params";
import { Errors } from "../../common/errors";
import {
  listVariants,
  getVariantById,
  createVariant,
  updateVariant,
  toggleVariantStatus,
  deleteVariant,
} from "./variants.service";

export async function getVariants(req: Request, res: Response) {
  const productId = requireParam(req, "id");
  const variants = await listVariants(productId);
  res.status(200).json({ variants });
}

export async function getVariant(req: Request, res: Response) {
  const variantId = requireParam(req, "variantId");
  const variant = await getVariantById(variantId);
  res.status(200).json({ variant });
}

export async function postVariant(req: Request, res: Response) {
  const productId = requireParam(req, "id");
  if (!req.user) throw Errors.sessionExpired();
  const variant = await createVariant(productId, req.body, req.user.id);
  res.status(201).json({ variant });
}

export async function patchVariant(req: Request, res: Response) {
  const variantId = requireParam(req, "variantId");
  if (!req.user) throw Errors.sessionExpired();
  const variant = await updateVariant(variantId, req.body, req.user.id);
  res.status(200).json({ variant });
}

export async function patchVariantStatus(req: Request, res: Response) {
  const variantId = requireParam(req, "variantId");
  const variant = await toggleVariantStatus(variantId, req.body);
  res.status(200).json({ variant });
}

export async function deleteVariantHandler(req: Request, res: Response) {
  const variantId = requireParam(req, "variantId");
  const result = await deleteVariant(variantId);
  res.status(200).json(result);
}