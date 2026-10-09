import { z } from "zod";
import { wholeQuantitySchema } from "./common";

export const supplierPurchaseItemSchema = z.object({
  productId: z.string().min(1, "Select a product."),
  size: z.string().trim().min(1, "Enter a size."),
  color: z.string().trim().min(1, "Enter a color."),
  quantity: wholeQuantitySchema.min(1, "Quantity must be at least 1."),
  /** Price per piece in paisa. */
  unitCost: z
    .number({ invalid_type_error: "Enter the price per piece." })
    .positive("Price per piece must be greater than 0."),
});
export type SupplierPurchaseItemInput = z.infer<typeof supplierPurchaseItemSchema>;

export const createSupplierPurchaseSchema = z.object({
  purchaseDate: z.string().min(1, "Date is required."),
  /** The supplier's own invoice/bill number, if they gave one. */
  billNo: z.string().optional(),
  items: z.array(supplierPurchaseItemSchema).min(1, "Add at least one item to the bill."),
  notes: z.string().optional(),
});
export type CreateSupplierPurchaseInput = z.infer<typeof createSupplierPurchaseSchema>;

export const voidSupplierPurchaseSchema = z.object({
  reason: z.string().min(3, "A reason is required to void a bill."),
});
export type VoidSupplierPurchaseInput = z.infer<typeof voidSupplierPurchaseSchema>;