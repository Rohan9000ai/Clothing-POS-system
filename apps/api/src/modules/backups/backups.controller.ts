import type { Request, Response } from "express";
import { Errors } from "../../common/errors";
import { createBackup, getBackupStatus } from "./backups.service";

export async function getBackups(_req: Request, res: Response) {
  res.status(200).json(getBackupStatus());
}

export async function postBackup(req: Request, res: Response) {
  if (!req.user) throw Errors.sessionExpired();
  const backup = await createBackup("MANUAL", req.user.id);
  res.status(201).json({ backup });
}