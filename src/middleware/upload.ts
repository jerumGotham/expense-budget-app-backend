import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, env.UPLOAD_DIR),
  filename: (_req, file, callback) => {
    const safeExtension = path.extname(file.originalname).toLowerCase() || ".jpg";
    callback(null, `${Date.now()}-${crypto.randomUUID()}${safeExtension}`);
  }
});

export const receiptUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return callback(new ApiError(400, "Only JPG, PNG, and WEBP receipts are allowed."));
    }
    callback(null, true);
  }
});
