import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { financeRouter } from "./routes/finance.routes.js";
import { receiptRouter } from "./routes/receipt.routes.js";
import { pushRouter } from "./routes/push.routes.js";
import { notFound } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";
import { ApiError } from "./utils/api-error.js";

export const app = express();

app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString()
    }
  });
});

app.use("/api/auth", authRouter);
app.use("/api/finance", financeRouter);
app.use("/api/receipts", receiptRouter);
app.use("/api/push", pushRouter);

app.use(notFound);

app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof ZodError) {
    return errorHandler(
      new ApiError(422, "Validation failed.", error.issues),
      req,
      res,
      next
    );
  }
  return errorHandler(error, req, res, next);
});
