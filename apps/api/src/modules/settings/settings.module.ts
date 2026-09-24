import { Router } from "express";
import { notImplemented } from "../../common/not-implemented";

export const settingsRouter = Router();

// TODO (Settings build-out): get/update receipt config, low-stock threshold
settingsRouter.get("/", notImplemented("settings"));
settingsRouter.put("/", notImplemented("settings"));