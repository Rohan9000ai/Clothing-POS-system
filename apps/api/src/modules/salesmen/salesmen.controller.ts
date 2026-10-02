import type { Request, Response } from "express";
import { listSalesmen } from "./salesmen.service";

export async function getSalesmen(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const salesmen = await listSalesmen(status);
  res.status(200).json({ salesmen });
}