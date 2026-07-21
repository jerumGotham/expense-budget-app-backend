import type { RequestHandler } from "express";
import { ApiError } from "../utils/api-error.js";
import { receiptService } from "../services/receipt.service.js";

export const uploadReceipt: RequestHandler = async (req, res) => {
  if (!req.file) throw new ApiError(400, "Receipt image is required.");
  const data = await receiptService.upload(req.userId!, req.file);
  res.status(201).json({ success: true, data });
};

export const getReceipt: RequestHandler = async (req, res) => {
  const data = await receiptService.get(req.userId!, req.params.id);
  res.json({ success: true, data });
};
