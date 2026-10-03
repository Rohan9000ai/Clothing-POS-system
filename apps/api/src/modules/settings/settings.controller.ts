import type { Request, Response } from "express";
import { getSettings } from "./settings.service";

export async function getSettingsHandler(_req: Request, res: Response) {
  const settings = await getSettings();
  res.status(200).json({ settings });
}