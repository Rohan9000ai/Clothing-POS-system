import { Router } from "express";
import { notImplemented } from "../../common/not-implemented";

export const authRouter = Router();

// TODO (Day 3 continued / auth build-out): login, logout, session refresh
authRouter.post("/login", notImplemented("auth"));
authRouter.post("/logout", notImplemented("auth"));