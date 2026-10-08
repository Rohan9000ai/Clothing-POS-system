import type { Request, Response } from "express";
import { requireParam } from "../../common/request-params";
import { Errors } from "../../common/errors";
import {
  listExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  voidExpense,
} from "./expenses.service";

export async function getExpenses(req: Request, res: Response) {
  const q = req.query as Record<string, string | undefined>;
  const result = await listExpenses({
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
    search: q.search,
    type: q.type,
    paymentMethod: q.paymentMethod,
    status: q.status,
    dateFrom: q.dateFrom,
    dateTo: q.dateTo,
  });
  res.status(200).json(result);
}

export async function getExpense(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const expense = await getExpenseById(id);
  res.status(200).json({ expense });
}

export async function postExpense(req: Request, res: Response) {
  if (!req.user) throw Errors.sessionExpired();
  const expense = await createExpense(req.body, req.user.id);
  res.status(201).json({ expense });
}

export async function patchExpense(req: Request, res: Response) {
  const id = requireParam(req, "id");
  if (!req.user) throw Errors.sessionExpired();
  const expense = await updateExpense(id, req.body, req.user.id);
  res.status(200).json({ expense });
}

export async function postVoidExpense(req: Request, res: Response) {
  const id = requireParam(req, "id");
  if (!req.user) throw Errors.sessionExpired();
  const expense = await voidExpense(id, req.body, req.user.id);
  res.status(200).json({ expense });
}