import type { Request, Response } from "express";
import { getDashboard } from "./dashboard.service";

export async function getDashboardHandler(_req: Request, res: Response) {
  const dashboard = await getDashboard();
  res.status(200).json({ dashboard });
}