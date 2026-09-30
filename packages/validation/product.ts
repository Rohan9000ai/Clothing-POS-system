import { z } from "zod";
import { moneySchema, wholeQuantitySchema } from "./common";

export const createProductVariantSchema = z.object({
  size: z.string().min(1, "Size is required."),
  color: z.string().min(1, "Color is required."),
  quantity: wholeQuantitySchema,
  priceOverride: moneySchema.nullable().optional(),
});
export type CreateProductVariantInput = z.infer<typeof createProductVariantSchema>;

export const updateProductVariantSchema = z.object({
  size: z.string().min(1, "Size is required.").optional(),
  color: z.string().min(1, "Color is required.").optional(),
  quantity: wholeQuantitySchema.optional(),
  priceOverride: moneySchema.nullable().optional(),
});
export type UpdateProductVariantInput = z.infer<typeof updateProductVariantSchema>;

export const toggleProductVariantStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
export type ToggleProductVariantStatusInput = z.infer<typeof toggleProductVariantStatusSchema>;

/**
 * quantityChange can be positive (found extra stock, new delivery counted
 * manually outside a supplier purchase flow) or negative (damaged goods,
 * stock count correction, theft/loss) — but the resulting quantity can
 * never go below 0.
 */
export const adjustStockSchema = z.object({
  quantityChange: z
    .number({ invalid_type_error: "Quantity change must be a number." })
    .int("Quantity change must be a whole number.")
    .refine((val) => val !== 0, "Quantity change cannot be zero."),
  reason: z.string().min(2, "A reason is required for stock adjustments."),
});
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

export const createProductSchema = z.object({
  name: z.string().min(2, "Product name is required."),
  categoryId: z.string().min(1, "Category is required."),
  basePrice: moneySchema,
  costPrice: moneySchema.nullable().optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().min(2, "Product name is required.").optional(),
  categoryId: z.string().min(1, "Category is required.").optional(),
  basePrice: moneySchema.optional(),
  costPrice: moneySchema.nullable().optional(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const toggleProductStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
export type ToggleProductStatusInput = z.infer<typeof toggleProductStatusSchema>;