import { z } from "zod";
import { passwordSchema } from "./common";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username can only contain letters, numbers, dots, dashes and underscores."),
  password: passwordSchema,
  role: z.enum(["ADMIN", "CASHIER"]),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

/** Full name and role only — username and password are changed via dedicated flows. */
export const updateUserSchema = z.object({
  fullName: z.string().min(2, "Full name is required.").optional(),
  role: z.enum(["ADMIN", "CASHIER"]).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const changePasswordSchema = z.object({
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const toggleUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
export type ToggleUserStatusInput = z.infer<typeof toggleUserStatusSchema>;