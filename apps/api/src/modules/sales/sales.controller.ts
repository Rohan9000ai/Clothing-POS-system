import type { Request, Response } from "express";
import { requireParam } from "../../common/request-params";
import { Errors } from "../../common/errors";
import { createSale, getSaleById, voidSale, listSales } from "./sales.service";

export async function postSale(req: Request, res: Response) {
  if (!req.user) throw Errors.sessionExpired();
  const sale = await createSale(req.body, req.user.id);
  res.status(201).json({ sale });
}

export async function getSale(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const sale = await getSaleById(id);
  res.status(200).json({ sale });
}

export async function postVoidSale(req: Request, res: Response) {
  const id = requireParam(req, "id");
  if (!req.user) throw Errors.sessionExpired();
  const sale = await voidSale(id, req.body, req.user.id);
  res.status(200).json({ sale });
}

export async function getSales(req: Request, res: Response) {
  const q = req.query as Record<string, string | undefined>;
  const result = await listSales({
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
    search: q.search,
    status: q.status,
    paymentStatus: q.paymentStatus,
    cashierId: q.cashierId,
    salesmanId: q.salesmanId,
    paymentMethod: q.paymentMethod,
    dateFrom: q.dateFrom,
    dateTo: q.dateTo,
  });
  res.status(200).json(result);
}