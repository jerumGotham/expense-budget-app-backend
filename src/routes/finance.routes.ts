import { Router } from "express";

import { asyncHandler } from "../utils/async-handler.js";
import { requireAuth } from "../middleware/auth.js";

import {
  createExpense,
  deleteExpense,
  getProfile,
  getReport,
  listExpenses,
  resetFinanceData,
  saveBudget,
  updateExpense,
  updateFinanceSettings,
} from "../controllers/finance.controller.js";

export const financeRouter = Router();

financeRouter.use(requireAuth);

financeRouter.get("/profile", asyncHandler(getProfile));

financeRouter.put("/profile", asyncHandler(saveBudget));

financeRouter.patch("/settings", asyncHandler(updateFinanceSettings));

financeRouter.delete("/reset", asyncHandler(resetFinanceData));

financeRouter.get("/expenses", asyncHandler(listExpenses));

financeRouter.post("/expenses", asyncHandler(createExpense));

financeRouter.patch("/expenses/:id", asyncHandler(updateExpense));

financeRouter.delete("/expenses/:id", asyncHandler(deleteExpense));

financeRouter.get("/reports/summary", asyncHandler(getReport));
