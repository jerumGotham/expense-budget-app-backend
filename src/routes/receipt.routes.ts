import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { receiptUpload } from "../middleware/upload.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  getReceipt,
  getReceiptImage,
  uploadReceipt
} from "../controllers/receipt.controller.js";

export const receiptRouter = Router();

receiptRouter.use(requireAuth);
receiptRouter.post("/upload", receiptUpload.single("receipt"), asyncHandler(uploadReceipt));
receiptRouter.get("/:id/image", asyncHandler(getReceiptImage));
receiptRouter.get("/:id", asyncHandler(getReceipt));
