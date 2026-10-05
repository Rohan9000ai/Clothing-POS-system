import type { Request, Response } from "express";
import { requireParam } from "../../common/request-params";
import {
  listSalesmen,
  getSalesmanById,
  createSalesman,
  updateSalesman,
  toggleSalesmanStatus,
  deleteSalesman,
} from "./salesmen.service";

export async function getSalesmen(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const salesmen = await listSalesmen(status);
  res.status(200).json({ salesmen });
}

export async function getSalesman(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const salesman = await getSalesmanById(id);
  res.status(200).json({ salesman });
}

export async function postSalesman(req: Request, res: Response) {
  const salesman = await createSalesman(req.body);
  res.status(201).json({ salesman });
}

export async function patchSalesman(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const salesman = await updateSalesman(id, req.body);
  res.status(200).json({ salesman });
}

export async function patchSalesmanStatus(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const salesman = await toggleSalesmanStatus(id, req.body);
  res.status(200).json({ salesman });
}

export async function deleteSalesmanHandler(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const result = await deleteSalesman(id);
  res.status(200).json(result);
}