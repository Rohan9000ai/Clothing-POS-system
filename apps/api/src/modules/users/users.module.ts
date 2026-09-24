import { Router } from "express";
import { notImplemented } from "../../common/not-implemented";

export const usersRouter = Router();

// TODO (Users build-out): list, create, update, toggle status
usersRouter.get("/", notImplemented("users"));
usersRouter.post("/", notImplemented("users"));
