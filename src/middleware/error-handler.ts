import type { ErrorRequestHandler } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { ApiError } from "../utils/api-error.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "A record with the same unique value already exists."
      });
    }
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    message: "Internal server error."
  });
};
