import type { Request, Response } from "express";
import { requireParam } from "../../common/request-params";
import {
  listCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
} from "./categories.service";

export async function getCategories(_req: Request, res: Response) {
  const categories = await listCategories();
  res.status(200).json({ categories });
}

export async function postCategory(req: Request, res: Response) {
  const category = await createCategory(req.body);
  res.status(201).json({ category });
}

export async function patchCategory(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const category = await updateCategory(id, req.body);
  res.status(200).json({ category });
}

export async function patchCategoryStatus(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const category = await toggleCategoryStatus(id, req.body);
  res.status(200).json({ category });
}

export async function deleteCategoryHandler(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const result = await deleteCategory(id);
  res.status(200).json(result);
}