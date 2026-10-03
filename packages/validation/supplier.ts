import { z } from "zod";
import { moneySchema, positiveMoneySchema, signedMoneySchema, phoneSchema } from "./common";

export const createSupplierSchema = z.object({
  name: z.string().min(2, "Supplier name is required."),
  phone: phoneSchema,
  address: z.string().min(3, "Address is required."),
  openingBalance: moneySchema.default(0),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = z.object({
  name: z.string().min(2, "Supplier name is required.").optional(),
  phone: phoneSchema.optional(),
  address: z.string().min(3, "Address is required.").optional(),
});
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const toggleSupplierStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
export type ToggleSupplierStatusInput = z.infer<typeof toggleSupplierStatusSchema>;

/**
 * PURCHASE and PAYMENT represent real money moving in one direction, so
 * amount must be strictly positive. ADJUSTMENT is a manual correction and
 * can push the balance up or down, so it allows a signed (but non-zero) value.
 */
export const createSupplierTransactionSchema = z
  .object({
    type: z.enum(["PURCHASE", "PAYMENT", "ADJUSTMENT"]),
    amount: z.number({ invalid_type_error: "Amount must be a number." }),
    paymentMethod: z.enum(["CASH", "ONLINE_TRANSFER"]),
    referenceNo: z.string().optional(),
    notes: z.string().optional(),
    date: z.string().min(1, "Date is required."),
  })
  .superRefine((data, ctx) => {
    if (data.type === "ADJUSTMENT") {
      const result = signedMoneySchema.safeParse(data.amount);
      if (!result.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["amount"], message: result.error.issues[0].message });
      }
    } else {
      const result = positiveMoneySchema.safeParse(data.amount);
      if (!result.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["amount"], message: result.error.issues[0].message });
      }
    }
  });
export type CreateSupplierTransactionInput = z.infer<typeof createSupplierTransactionSchema>;