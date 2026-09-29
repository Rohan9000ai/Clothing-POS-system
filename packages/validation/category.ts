import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2, "Category name is required."),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().min(2, "Category name is required.").optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const toggleCategoryStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
export type ToggleCategoryStatusInput = z.infer<typeof toggleCategoryStatusSchema>;