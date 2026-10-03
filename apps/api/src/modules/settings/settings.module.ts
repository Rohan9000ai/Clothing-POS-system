import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { requireAuth } from "../../common/auth-guard.middleware";
import { notImplemented } from "../../common/not-implemented";
import { getSettingsHandler } from "./settings.controller";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

// Read is needed now for the invoice/receipt (shop name, header, footer).
// Full editing UI + PUT lands on its own Settings build day.
settingsRouter.get("/", asyncHandler(getSettingsHandler));
settingsRouter.put("/", notImplemented("settings"));