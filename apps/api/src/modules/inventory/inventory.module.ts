import { Router } from "express";
import { notImplemented } from "../../common/not-implemented";

export const inventoryRouter = Router();

// TODO (Inventory build-out): products, variants, images, categories, low-stock
inventoryRouter.get("/products", notImplemented("inventory"));
inventoryRouter.post("/products", notImplemented("inventory"));