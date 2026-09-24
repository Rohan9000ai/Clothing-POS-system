import { Router } from "express";
import { notImplemented } from "../../common/not-implemented";

export const salesRouter = Router();

// TODO (Sales/Cashier build-out): create sale (transactional), list, void, print
salesRouter.get("/", notImplemented("sales"));
salesRouter.post("/", notImplemented("sales"));