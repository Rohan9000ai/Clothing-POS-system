import type { Request, Response } from "express";
import { Errors } from "../../common/errors";
import { getSettings, updateSettings } from "./settings.service";

export async function getSettingsHandler(_req: Request, res: Response) {
  const settings = await getSettings();
  res.status(200).json({ settings });
}

export async function putSettingsHandler(req: Request, res: Response) {
  if (!req.user) throw Errors.sessionExpired();
  const settings = await updateSettings(req.body, req.user.id);
  res.status(200).json({ settings });
}