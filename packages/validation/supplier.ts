import { z } from "zod";
import { moneySchema, phoneSchema } from "./common";

export const createSupplierSchema = z.object({
  name: z.string().min(2, "Supplier name is required."),
  phone: phoneSchema,
  address: z.string().min(3, "Address is required."),
  openingBalance: moneySchema.default(0),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const createSupplierTransactionSchema = z.object({
  supplierId: z.string().min(1),
  type: z.enum(["PURCHASE", "PAYMENT", "ADJUSTMENT"]),
  amount: moneySchema,
  paymentMethod: z.enum(["CASH", "ONLINE_TRANSFER"]),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().min(1, "Date is required."),
});
export type CreateSupplierTransactionInput = z.infer<typeof createSupplierTransactionSchema>;