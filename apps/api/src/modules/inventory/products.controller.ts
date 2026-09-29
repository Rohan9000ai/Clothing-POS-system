import type { Request, Response } from "express";
import { requireParam } from "../../common/request-params";
import { Errors } from "../../common/errors";
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
  addProductImages,
  deleteProductImage,
  setPrimaryProductImage,
} from "./products.service";

export async function getProducts(req: Request, res: Response) {
  const q = req.query as Record<string, string | undefined>;
  const result = await listProducts({
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
    search: q.search,
    categoryId: q.categoryId,
    status: q.status,
  });
  res.status(200).json(result);
}

export async function getProduct(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const product = await getProductById(id);
  res.status(200).json({ product });
}

export async function postProduct(req: Request, res: Response) {
  const product = await createProduct(req.body);
  res.status(201).json({ product });
}

export async function patchProduct(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const product = await updateProduct(id, req.body);
  res.status(200).json({ product });
}

export async function patchProductStatus(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const product = await toggleProductStatus(id, req.body);
  res.status(200).json({ product });
}

export async function deleteProductHandler(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const result = await deleteProduct(id);
  res.status(200).json(result);
}

export async function postProductImages(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    throw Errors.validation("At least one image file is required.");
  }
  const product = await addProductImages(id, files);
  res.status(201).json({ product });
}

export async function deleteProductImageHandler(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const imageId = requireParam(req, "imageId");
  const product = await deleteProductImage(id, imageId);
  res.status(200).json({ product });
}

export async function patchProductImagePrimary(req: Request, res: Response) {
  const id = requireParam(req, "id");
  const imageId = requireParam(req, "imageId");
  const product = await setPrimaryProductImage(id, imageId);
  res.status(200).json({ product });
}