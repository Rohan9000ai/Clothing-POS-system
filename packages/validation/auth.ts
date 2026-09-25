import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(["ADMIN", "CASHIER"]),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;