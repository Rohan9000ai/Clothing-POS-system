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
  createProductVariantSchema,
  updateProductVariantSchema,
  toggleProductVariantStatusSchema,
  adjustStockSchema,
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
import {
  getVariants,
  getVariant,
  postVariant,
  patchVariant,
  patchVariantStatus,
  deleteVariantHandler,
} from "./variants.controller";
import {
  postStockAdjustment,
  getVariantMovements,
  getLowStock,
  getCashierProducts,
} from "./stock.controller";

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

// Cashier-facing + low-stock queries — placed before the generic /products/:id
// routes purely for readability; Express matches these literal paths fine
// either way since none of them collide with a plain :id segment.
inventoryRouter.get("/low-stock", asyncHandler(getLowStock));
inventoryRouter.get("/cashier-products", asyncHandler(getCashierProducts));

// Products — read open to any authenticated user (cashier billing needs this later), writes admin-only.
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

// Product variants — read open to any authenticated user, writes admin-only.
inventoryRouter.get("/products/:id/variants", asyncHandler(getVariants));
inventoryRouter.get("/products/:id/variants/:variantId", asyncHandler(getVariant));
inventoryRouter.post(
  "/products/:id/variants",
  requireRole("ADMIN"),
  validate(createProductVariantSchema),
  asyncHandler(postVariant)
);
inventoryRouter.patch(
  "/products/:id/variants/:variantId",
  requireRole("ADMIN"),
  validate(updateProductVariantSchema),
  asyncHandler(patchVariant)
);
inventoryRouter.patch(
  "/products/:id/variants/:variantId/status",
  requireRole("ADMIN"),
  validate(toggleProductVariantStatusSchema),
  asyncHandler(patchVariantStatus)
);
inventoryRouter.delete(
  "/products/:id/variants/:variantId",
  requireRole("ADMIN"),
  asyncHandler(deleteVariantHandler)
);

// Stock adjustments + movement history — admin-only to adjust, readable by any authenticated user.
inventoryRouter.post(
  "/products/:id/variants/:variantId/adjust",
  requireRole("ADMIN"),
  validate(adjustStockSchema),
  asyncHandler(postStockAdjustment)
);
inventoryRouter.get("/products/:id/variants/:variantId/movements", asyncHandler(getVariantMovements));