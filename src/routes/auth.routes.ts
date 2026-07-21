import { Router } from "express";

import { asyncHandler } from "../utils/async-handler.js";
import { requireAuth } from "../middleware/auth.js";

import {
  login,
  me,
  register,
  updateAccount,
} from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", asyncHandler(register));

authRouter.post("/login", asyncHandler(login));

authRouter.get("/me", requireAuth, asyncHandler(me));

authRouter.patch("/account", requireAuth, asyncHandler(updateAccount));
