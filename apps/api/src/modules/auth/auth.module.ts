import { Router } from "express";
import { asyncHandler } from "../../common/error-handler.middleware";
import { validate } from "../../common/validate.middleware";
import { requireAuth } from "../../common/auth-guard.middleware";
import { loginSchema } from "@muzammil-pos/validation";
import { login, logout, me } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), asyncHandler(login));
authRouter.post("/logout", requireAuth, asyncHandler(logout));
authRouter.get("/me", requireAuth, asyncHandler(me));