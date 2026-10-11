import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { requireAuth, requireRole } from "../../common/auth-guard.middleware";
import { getBackups, postBackup } from "./backups.controller";

export const backupsRouter = Router();

// Backups contain every shop record, so this is admin-only end to end.
backupsRouter.use(requireAuth, requireRole("ADMIN"));

backupsRouter.get("/", asyncHandler(getBackups));
backupsRouter.post("/", asyncHandler(postBackup));