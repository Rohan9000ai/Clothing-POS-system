import { z } from "zod";
import { moneySchema, wholeQuantitySchema } from "./common";

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: wholeQuantitySchema.min(1, "Quantity must be at least 1."),
  lineDiscount: moneySchema.default(0),
});

export const salePaymentSchema = z
  .object({
    method: z.enum(["CASH", "EASYPAISA", "JAZZCASH", "BANK_TRANSFER"]),
    amount: moneySchema,
    referenceNo: z.string().optional(),
  })
  .refine((data) => data.method === "CASH" || !!data.referenceNo, {
    message: "Reference number is required for non-cash payments.",
    path: ["referenceNo"],
  });

export const createSaleSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  salesmanId: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "Add at least one item to the sale."),
  discountTotal: moneySchema.default(0),
  payments: z.array(salePaymentSchema).min(1, "At least one payment is required."),
  notes: z.string().optional(),
});
export type CreateSaleInput = z.infer<typeof createSaleSchema>;