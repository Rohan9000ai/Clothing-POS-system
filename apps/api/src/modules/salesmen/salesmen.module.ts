import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { requireAuth } from "../../common/auth-guard.middleware";
import { notImplemented } from "../../common/not-implemented";
import { getSalesmen } from "./salesmen.controller";

export const salesmenRouter = Router();

salesmenRouter.use(requireAuth);

// Full CRUD lands on its own build day — list is needed now for the
// Cashier POS salesman dropdown (and later, the Admin Salesmen screen).
salesmenRouter.get("/", asyncHandler(getSalesmen));
salesmenRouter.post("/", notImplemented("salesmen"));