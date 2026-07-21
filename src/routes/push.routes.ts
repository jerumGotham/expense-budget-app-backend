import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { registerPushToken } from "../controllers/push.controller.js";

export const pushRouter = Router();

pushRouter.use(requireAuth);
pushRouter.post("/tokens", asyncHandler(registerPushToken));
