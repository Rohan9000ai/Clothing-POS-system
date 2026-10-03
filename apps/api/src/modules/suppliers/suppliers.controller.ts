import type { Request, Response } from "express";
import { requireParam } from "../../common/request-params";
import { Errors } from "../../common/errors";
import {
  listSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  toggleSupplierStatus,
  deleteSupplier,
  createSupplierTransaction,
  listSupplierTransactions,
} from "./suppliers.service";

export async function getSuppliers(_req: Request, res: Response) {
  const suppliers = await listSuppliers();
  res.status(200).json({ suppliers });
}

export async function getSupplier(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const supplier = await getSupplierById(id);
  res.status(200).json({ supplier });
}

export async function postSupplier(req: Request, res: Response) {
  const supplier = await createSupplier(req.body);
  res.status(201).json({ supplier });
}

export async function patchSupplier(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const supplier = await updateSupplier(id, req.body);
  res.status(200).json({ supplier });
}

export async function patchSupplierStatus(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const supplier = await toggleSupplierStatus(id, req.body);
  res.status(200).json({ supplier });
}

export async function deleteSupplierHandler(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const result = await deleteSupplier(id);
  res.status(200).json(result);
}

export async function postSupplierTransaction(req: Request, res: Response) {
  const id = requireParam(req, "id");
  if (!req.user) throw Errors.sessionExpired();
  const transaction = await createSupplierTransaction(id, req.body, req.user.id);
  res.status(201).json({ transaction });
}

export async function getSupplierTransactions(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const transactions = await listSupplierTransactions(id);
  res.status(200).json({ transactions });
}