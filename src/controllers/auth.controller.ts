import type { RequestHandler } from "express";

import { authService } from "../services/auth.service.js";
import {
  loginSchema,
  registerSchema,
  updateAccountSchema,
} from "../validators/auth.schemas.js";

export const register: RequestHandler = async (req, res) => {
  const input = registerSchema.parse(req.body);

  const result = await authService.register(input);

  res.status(201).json({
    success: true,
    data: result,
  });
};

export const login: RequestHandler = async (req, res) => {
  const input = loginSchema.parse(req.body);

  const result = await authService.login(input);

  res.json({
    success: true,
    data: result,
  });
};

export const me: RequestHandler = async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: "Authentication is required.",
    });

    return;
  }

  const result = await authService.getCurrentUser(userId);

  res.json({
    success: true,
    data: result,
  });
};

export const updateAccount: RequestHandler = async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: "Authentication is required.",
    });

    return;
  }

  const input = updateAccountSchema.parse(req.body);

  const result = await authService.updateAccount(userId, input);

  res.json({
    success: true,
    data: result,
  });
};
