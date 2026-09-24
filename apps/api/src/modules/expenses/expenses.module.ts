import { Router } from "express";
import { notImplemented } from "../../common/not-implemented";

export const expensesRouter = Router();

// TODO (Expenses build-out): add/list/filter, Print PDF
expensesRouter.get("/", notImplemented("expenses"));
expensesRouter.post("/", notImplemented("expenses"));