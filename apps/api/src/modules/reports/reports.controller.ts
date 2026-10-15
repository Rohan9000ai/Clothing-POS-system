import type { Request, Response } from "express";
import type { SalesReportQuery } from "@muzammil-pos/validation";
import { getSalesReport } from "./sales-report.service";

export async function getSalesReportHandler(req: Request, res: Response) {
  // validate() has already checked the query and filled in the defaults.
  const report = await getSalesReport(req.query as unknown as SalesReportQuery);
  res.status(200).json({ report });
}