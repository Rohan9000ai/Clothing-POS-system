import type { Request, Response } from "express";
import type { ReportQuery, StockReportQuery } from "@muzammil-pos/validation";
import { getSalesReport } from "./sales-report.service";
import { getExpenseReport } from "./expense-report.service";
import { getFinancialReport } from "./financial-report.service";
import { getStockReport } from "./stock-report.service";
import { getReceivablesReport } from "./receivables-report.service";
import { getPayablesReport } from "./payables-report.service";

// validate() has already checked the query and filled in the defaults.

export async function getSalesReportHandler(req: Request, res: Response) {
  const report = await getSalesReport(req.query as unknown as ReportQuery);
  res.status(200).json({ report });
}

export async function getExpenseReportHandler(req: Request, res: Response) {
  const report = await getExpenseReport(req.query as unknown as ReportQuery);
  res.status(200).json({ report });
}

export async function getFinancialReportHandler(req: Request, res: Response) {
  const report = await getFinancialReport(req.query as unknown as ReportQuery);
  res.status(200).json({ report });
}

export async function getStockReportHandler(req: Request, res: Response) {
  const report = await getStockReport(req.query as unknown as StockReportQuery);
  res.status(200).json({ report });
}

export async function getReceivablesReportHandler(_req: Request, res: Response) {
  const report = await getReceivablesReport();
  res.status(200).json({ report });
}

export async function getPayablesReportHandler(_req: Request, res: Response) {
  const report = await getPayablesReport();
  res.status(200).json({ report });
}