import type { Request, Response } from "express";
import { loginUser, getCurrentUser } from "./auth.service";
import { Errors } from "../../common/errors";

export async function login(req: Request, res: Response) {
  const result = await loginUser(req.body);
  res.status(200).json(result);
}

export async function logout(_req: Request, res: Response) {
  // JWT sessions are stateless — the client discards the token. This
  // endpoint exists for a consistent API shape and a future point to add
  // token blocklisting if that's ever needed.
  res.status(200).json({ success: true });
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    throw Errors.sessionExpired();
  }
  const user = await getCurrentUser(req.user.id);
  res.status(200).json({ user });
}