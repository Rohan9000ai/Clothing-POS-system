import type { Request, Response } from "express";
import { requireParam } from "../../common/request-params";
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  changeUserPassword,
  toggleUserStatus,
  deleteUser,
} from "./users.service";

export async function getUsers(_req: Request, res: Response) {
  const users = await listUsers();
  res.status(200).json({ users });
}

export async function getUser(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const user = await getUserById(id);
  res.status(200).json({ user });
}

export async function postUser(req: Request, res: Response) {
  const user = await createUser(req.body);
  res.status(201).json({ user });
}

export async function patchUser(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const user = await updateUser(id, req.body);
  res.status(200).json({ user });
}

export async function patchUserPassword(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const result = await changeUserPassword(id, req.body);
  res.status(200).json(result);
}

export async function patchUserStatus(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const user = await toggleUserStatus(id, req.body);
  res.status(200).json({ user });
}

export async function deleteUserHandler(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const result = await deleteUser(id);
  res.status(200).json(result);
}