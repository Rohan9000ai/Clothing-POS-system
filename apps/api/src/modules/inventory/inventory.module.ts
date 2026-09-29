import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { validate } from "../../common/validate.middleware";
import { requireAuth, requireRole } from "../../common/auth-guard.middleware";
import { uploadProductImages } from "../../common/upload";
import {
  createCategorySchema,
  updateCategorySchema,
  toggleCategoryStatusSchema,
  createProductSchema,
  updateProductSchema,
  toggleProductStatusSchema,
} from "@muzammil-pos/validation";
import {
  getCategories,
  postCategory,
  patchCategory,
  patchCategoryStatus,
  deleteCategoryHandler,
} from "./categories.controller";
import {
  getProducts,
  getProduct,
  postProduct,
  patchProduct,
  patchProductStatus,
  deleteProductHandler,
  postProductImages,
  deleteProductImageHandler,
  patchProductImagePrimary,
} from "./products.controller";

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth);

// Categories — read open to any authenticated user, writes admin-only.
inventoryRouter.get("/categories", asyncHandler(getCategories));
inventoryRouter.post(
  "/categories",
  requireRole("ADMIN"),
  validate(createCategorySchema),
  asyncHandler(postCategory)
);
inventoryRouter.patch(
  "/categories/:id",
  requireRole("ADMIN"),
  validate(updateCategorySchema),
  asyncHandler(patchCategory)
);
inventoryRouter.patch(
  "/categories/:id/status",
  requireRole("ADMIN"),
  validate(toggleCategoryStatusSchema),
  asyncHandler(patchCategoryStatus)
);
inventoryRouter.delete("/categories/:id", requireRole("ADMIN"), asyncHandler(deleteCategoryHandler));

// Products — read open to any authenticated user (cashier will need this for
// billing later), writes admin-only.
inventoryRouter.get("/products", asyncHandler(getProducts));
inventoryRouter.get("/products/:id", asyncHandler(getProduct));
inventoryRouter.post(
  "/products",
  requireRole("ADMIN"),
  validate(createProductSchema),
  asyncHandler(postProduct)
);
inventoryRouter.patch(
  "/products/:id",
  requireRole("ADMIN"),
  validate(updateProductSchema),
  asyncHandler(patchProduct)
);
inventoryRouter.patch(
  "/products/:id/status",
  requireRole("ADMIN"),
  validate(toggleProductStatusSchema),
  asyncHandler(patchProductStatus)
);
inventoryRouter.delete("/products/:id", requireRole("ADMIN"), asyncHandler(deleteProductHandler));

// Product images — multipart/form-data, kept separate from the JSON product routes above.
inventoryRouter.post(
  "/products/:id/images",
  requireRole("ADMIN"),
  uploadProductImages.array("images", 5),
  asyncHandler(postProductImages)
);
inventoryRouter.delete(
  "/products/:id/images/:imageId",
  requireRole("ADMIN"),
  asyncHandler(deleteProductImageHandler)
);
inventoryRouter.patch(
  "/products/:id/images/:imageId/primary",
  requireRole("ADMIN"),
  asyncHandler(patchProductImagePrimary)
);