import { z } from "zod";
import { wholeQuantitySchema } from "./common";

/** Rs 20,000,000 in paisa. Safely inside what the database can store for one amount. */
export const MAX_BILL_PAISA = 2_000_000_000;

export const supplierPurchaseItemSchema = z.object({
  productId: z.string().min(1, "Select a product."),
  size: z.string().trim().min(1, "Enter a size."),
  color: z.string().trim().min(1, "Enter a color."),
  quantity: wholeQuantitySchema
    .min(1, "Quantity must be at least 1.")
    .max(100000, "Quantity can be at most 100,000 pieces on one line."),
  /** Price per piece in paisa. */
  unitCost: z
    .number({ invalid_type_error: "Enter the price per piece." })
    .positive("Price per piece must be greater than 0.")
    .max(100_000_000, "Price per piece can be at most Rs 1,000,000."),
});
export type SupplierPurchaseItemInput = z.infer<typeof supplierPurchaseItemSchema>;

export const createSupplierPurchaseSchema = z
  .object({
    purchaseDate: z.string().min(1, "Date is required."),
    /** The supplier's own invoice/bill number, if they gave one. */
    billNo: z.string().optional(),
    items: z.array(supplierPurchaseItemSchema).min(1, "Add at least one item to the bill."),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    if (total > MAX_BILL_PAISA) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "This bill is too big (more than Rs 20,000,000). Check the quantity and the price per piece.",
      });
    }
  });
export type CreateSupplierPurchaseInput = z.infer<typeof createSupplierPurchaseSchema>;

export const voidSupplierPurchaseSchema = z.object({
  reason: z.string().min(3, "A reason is required to void a bill."),
});
export type VoidSupplierPurchaseInput = z.infer<typeof voidSupplierPurchaseSchema>;