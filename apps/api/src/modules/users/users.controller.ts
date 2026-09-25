import type { Request, Response } from "express";
import { listUsers, createUser } from "./users.service";

export async function getUsers(_req: Request, res: Response) {
  const users = await listUsers();
  res.status(200).json({ users });
}

export async function postUser(req: Request, res: Response) {
  const user = await createUser(req.body);
  res.status(201).json({ user });
}