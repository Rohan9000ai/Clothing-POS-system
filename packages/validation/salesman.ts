import { z } from "zod";
import { cnicSchema, moneySchema, phoneSchema } from "./common";

export const createSalesmanSchema = z.object({
  name: z.string().min(2, "Name is required."),
  phone: phoneSchema,
  cnic: cnicSchema,
  joinDate: z.string().min(1, "Join date is required."),
  salary: moneySchema,
  /** Optional — links this salesman to an existing CASHIER login account. */
  userId: z.string().optional(),
});
export type CreateSalesmanInput = z.infer<typeof createSalesmanSchema>;

export const updateSalesmanSchema = z.object({
  name: z.string().min(2, "Name is required.").optional(),
  phone: phoneSchema.optional(),
  cnic: cnicSchema.optional(),
  joinDate: z.string().min(1, "Join date is required.").optional(),
  salary: moneySchema.optional(),
  /** Pass null to unlink, a user id to link/relink, or omit to leave unchanged. */
  userId: z.string().nullable().optional(),
});
export type UpdateSalesmanInput = z.infer<typeof updateSalesmanSchema>;

export const toggleSalesmanStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
export type ToggleSalesmanStatusInput = z.infer<typeof toggleSalesmanStatusSchema>;