import { Router } from "express";
import { notImplemented } from "../../common/not-implemented";

export const suppliersRouter = Router();

// TODO (Suppliers build-out): CRUD + supplier_transactions + balance calc
suppliersRouter.get("/", notImplemented("suppliers"));
suppliersRouter.post("/", notImplemented("suppliers"));