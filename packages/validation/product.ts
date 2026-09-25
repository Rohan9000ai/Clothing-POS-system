import { z } from "zod";
import { moneySchema, wholeQuantitySchema } from "./common";

export const createProductVariantSchema = z.object({
  size: z.string().min(1, "Size is required."),
  color: z.string().min(1, "Color is required."),
  quantity: wholeQuantitySchema,
  priceOverride: moneySchema.nullable().optional(),
});
export type CreateProductVariantInput = z.infer<typeof createProductVariantSchema>;

export const createProductSchema = z.object({
  name: z.string().min(2, "Product name is required."),
  categoryId: z.string().min(1, "Category is required."),
  basePrice: moneySchema,
  costPrice: moneySchema.nullable().optional(),
  variants: z.array(createProductVariantSchema).min(1, "At least one variant is required."),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;