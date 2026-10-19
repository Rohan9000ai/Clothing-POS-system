import { z } from "zod";

const singleLine = (value: string) => !/[\r\n]/.test(value);

export const updateSettingsSchema = z.object({
  shopName: z
    .string({ required_error: "Shop name is required." })
    .trim()
    .min(2, "Shop name is required.")
    .max(60, "Shop name can be at most 60 characters.")
    .refine(singleLine, "Shop name must be a single line."),
  receiptHeader: z
    .string()
    .trim()
    .max(120, "Header can be at most 120 characters.")
    .refine(singleLine, "Header must be a single line.")
    .default(""),
  receiptFooter: z
    .string()
    .trim()
    .max(200, "Footer can be at most 200 characters.")
    .refine((value) => value.split(/\r?\n/).length <= 4, "Footer can have at most 4 lines.")
    .default(""),
  taxPercent: z
    .number({ required_error: "Tax is required.", invalid_type_error: "Tax must be a number." })
    .min(0, "Tax cannot be negative.")
    .max(100, "Tax cannot be more than 100%."),
  lowStockThreshold: z
    .number({ required_error: "Low stock limit is required.", invalid_type_error: "Low stock limit must be a number." })
    .int("Low stock limit must be a whole number.")
    .min(1, "Low stock limit must be at least 1.")
    .max(1000, "Low stock limit can be at most 1000."),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;