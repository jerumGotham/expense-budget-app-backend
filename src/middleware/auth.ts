import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

type TokenPayload = {
  sub: string;
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Authentication required."));
  }

  const token = header.slice(7).trim();

  if (!token) {
    return next(new ApiError(401, "Access token is missing."));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

    if (!payload.sub) {
      return next(new ApiError(401, "Invalid access token."));
    }

    req.userId = payload.sub;

    return next();
  } catch {
    return next(new ApiError(401, "Invalid or expired access token."));
  }
};
