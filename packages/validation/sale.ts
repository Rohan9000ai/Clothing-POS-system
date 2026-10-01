import { z } from "zod";
import { moneySchema, wholeQuantitySchema } from "./common";

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: wholeQuantitySchema.min(1, "Quantity must be at least 1."),
  lineDiscount: moneySchema.default(0),
});
export type SaleItemInput = z.infer<typeof saleItemSchema>;

export const salePaymentSchema = z
  .object({
    method: z.enum(["CASH", "EASYPAISA", "JAZZCASH", "BANK_TRANSFER"]),
    amount: moneySchema,
    referenceNo: z.string().optional(),
  })
  .refine((data) => data.method === "CASH" || !!data.referenceNo?.trim(), {
    message: "Reference number is required for non-cash payments.",
    path: ["referenceNo"],
  });
export type SalePaymentInput = z.infer<typeof salePaymentSchema>;

export const createSaleSchema = z.object({
  // Omitted -> resolved to the shared "Walk-in" customer server-side.
  customerId: z.string().optional(),
  salesmanId: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "Add at least one item to the sale."),
  // Additional discount on top of any per-item discounts.
  discountTotal: moneySchema.default(0),
  // Empty array -> fully unpaid (credit) sale. paymentStatus is computed
  // server-side from payments vs. net total, never trusted from the client.
  payments: z.array(salePaymentSchema).default([]),
  notes: z.string().optional(),
});
export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const voidSaleSchema = z.object({
  reason: z.string().min(3, "A reason is required to void a sale."),
});
export type VoidSaleInput = z.infer<typeof voidSaleSchema>;