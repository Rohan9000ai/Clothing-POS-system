import { z } from "zod";
import { positiveMoneySchema } from "./common";

export const createExpenseSchema = z
  .object({
    expenseDate: z.string().min(1, "Date is required."),
    title: z.string().optional(),
    type: z.enum(["ELECTRICITY", "SALARIES", "PAYOUTS", "SUPPLIER_PAYMENT", "TAXES", "OTHER"]),
    amount: positiveMoneySchema,
    paymentMethod: z.enum(["CASH", "ONLINE_TRANSFER"]),
    referenceNo: z.string().optional(),
    supplierId: z.string().optional(),
    salesmanId: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.type !== "OTHER" || (data.title && data.title.trim().length > 0), {
    message: "Title is required when expense type is Other.",
    path: ["title"],
  });
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;