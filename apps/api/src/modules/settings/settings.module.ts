import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { validate } from "../../common/validate.middleware";
import { requireAuth, requireRole } from "../../common/auth-guard.middleware";
import { updateSettingsSchema } from "@muzammil-pos/validation";
import { getSettingsHandler, putSettingsHandler } from "./settings.controller";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

// Any signed-in user can read (the cashier screen needs the stock limit); only an admin can change.
settingsRouter.get("/", asyncHandler(getSettingsHandler));
settingsRouter.put("/", requireRole("ADMIN"), validate(updateSettingsSchema), asyncHandler(putSettingsHandler));