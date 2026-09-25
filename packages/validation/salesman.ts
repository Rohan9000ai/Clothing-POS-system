import { z } from "zod";
import { cnicSchema, moneySchema, phoneSchema } from "./common";

export const createSalesmanSchema = z.object({
  name: z.string().min(2, "Name is required."),
  phone: phoneSchema,
  cnic: cnicSchema,
  joinDate: z.string().min(1, "Join date is required."),
  salary: moneySchema,
});
export type CreateSalesmanInput = z.infer<typeof createSalesmanSchema>;