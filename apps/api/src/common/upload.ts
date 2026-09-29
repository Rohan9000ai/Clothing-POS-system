/**
 * Multer configuration for product image uploads. Files are saved to disk
 * under UPLOADS_DIR/products (see common/env.ts) and served statically by
 * Express (see main.ts) so the desktop renderer can load them by URL.
 */

import multer from "multer";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import type { Request } from "express";
import { env } from "./env";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = env.maxUploadSizeMb * 1024 * 1024;

export const productImagesDir = path.join(env.uploadsRootDir, "products");

function ensureUploadsDir() {
  if (!fs.existsSync(productImagesDir)) {
    fs.mkdirSync(productImagesDir, { recursive: true });
  }
}
ensureUploadsDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadsDir();
    cb(null, productImagesDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const unique = crypto.randomBytes(8).toString("hex");
    cb(null, `${Date.now()}-${unique}${ext}`);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new Error("INVALID_IMAGE_FILE"));
    return;
  }
  cb(null, true);
}

export const uploadProductImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 5 },
});

/** Public URL path for a stored product image file, served via express.static in main.ts. */
export function productImageUrl(fileName: string): string {
  return `/uploads/products/${fileName}`;
}