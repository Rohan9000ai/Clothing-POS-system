import { z } from "zod";

/** Money input from forms — always entered/displayed as rupees, converted to paisa before hitting the API. */
export const moneySchema = z
  .number({ invalid_type_error: "Amount must be a number." })
  .nonnegative("Amount cannot be negative.");

export const positiveMoneySchema = z
  .number({ invalid_type_error: "Amount must be a number." })
  .positive("Amount must be greater than 0.");

export const wholeQuantitySchema = z
  .number({ invalid_type_error: "Quantity must be a number." })
  .int("Quantity must be a whole number.")
  .nonnegative("Quantity cannot be negative.");

/** Pakistani mobile format, e.g. 0300-1234567 or +92 300 1234567 — kept permissive. */
export const phoneSchema = z
  .string()
  .min(7, "Phone number is too short.")
  .regex(/^[0-9+\-\s()]+$/, "Phone number contains invalid characters.");

/** CNIC format: 12345-1234567-1 */
export const cnicSchema = z
  .string()
  .regex(/^\d{5}-\d{7}-\d{1}$/, "CNIC must be in the format 12345-1234567-1.");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});