import { z } from "zod";

const categoryName = z
  .string()
  .trim()
  .min(2, "Category name is required.")
  .max(40, "Category name can be at most 40 characters.");

export const createCategorySchema = z.object({ name: categoryName });
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({ name: categoryName.optional() });
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const toggleCategoryStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
export type ToggleCategoryStatusInput = z.infer<typeof toggleCategoryStatusSchema>;