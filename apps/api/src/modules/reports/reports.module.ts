import { Router } from "express";
import { notImplemented } from "../../common/not-implemented";

export const reportsRouter = Router();

// TODO (Reports build-out): receivables, payables, sales, stock, financial, profit/loss
reportsRouter.get("/financial", notImplemented("reports"));