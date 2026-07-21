import type { RequestHandler } from "express";
import { financeService } from "../services/finance.service.js";
import { alertService } from "../services/alert.service.js";
import {
  createExpenseSchema,
  reportQuerySchema,
  saveBudgetSchema,
  updateExpenseSchema,
  updateFinanceSettingsSchema,
} from "../validators/finance.schemas.js";
import { ApiError } from "../utils/api-error.js";

export const getProfile: RequestHandler = async (req, res) => {
  const data = await financeService.getProfile(req.userId!);
  res.json({ success: true, data });
};

export const saveBudget: RequestHandler = async (req, res) => {
  const input = saveBudgetSchema.parse(req.body);
  const data = await financeService.saveBudget(req.userId!, input);
  res.json({ success: true, data });
};

export const createExpense: RequestHandler = async (req, res) => {
  const input = createExpenseSchema.parse(req.body);
  const expense = await financeService.createExpense(req.userId!, input);
  const alerts = await alertService.checkCategory(
    req.userId!,
    expense.categoryId,
    expense.expenseDate,
  );

  res.status(201).json({
    success: true,
    data: {
      expense: {
        id: expense.id,
        title: expense.title,
        amount: Number(expense.amount),
        categoryId: expense.categoryId,
        categoryName: expense.category.name,
        date: expense.expenseDate.toISOString(),
        source: expense.source.toLowerCase(),
      },
      alerts,
    },
  });
};

export const listExpenses: RequestHandler = async (req, res) => {
  const parsed = reportQuerySchema.parse({
    filter: req.query.filter,
    date: req.query.date,
  });

  const data = await financeService.listExpenses(req.userId!, {
    filter: parsed.filter,
    referenceDate: parsed.date
      ? new Date(`${parsed.date}T00:00:00.000Z`)
      : undefined,
    categoryId:
      typeof req.query.categoryId === "string"
        ? req.query.categoryId
        : undefined,
    page: Math.max(Number(req.query.page ?? 1), 1),
    pageSize: Math.min(Math.max(Number(req.query.pageSize ?? 20), 1), 100),
  });

  res.json({ success: true, data });
};

export const updateExpense: RequestHandler = async (req, res) => {
  const input = updateExpenseSchema.parse(req.body);
  const expense = await financeService.updateExpense(
    req.userId!,
    req.params.id as string,
    input,
  );
  const alerts = await alertService.checkCategory(
    req.userId!,
    expense.categoryId,
    expense.expenseDate,
  );

  res.json({
    success: true,
    data: {
      expense: {
        id: expense.id,
        title: expense.title,
        amount: Number(expense.amount),
        categoryId: expense.categoryId,
        categoryName: expense.category.name,
        date: expense.expenseDate.toISOString(),
        source: expense.source.toLowerCase(),
      },
      alerts,
    },
  });
};

export const deleteExpense: RequestHandler = async (req, res) => {
  await financeService.deleteExpense(req.userId!, req.params.id as string);
  res.status(204).send();
};

export const getReport: RequestHandler = async (req, res) => {
  const input = reportQuerySchema.parse({
    filter: req.query.filter,
    date: req.query.date,
  });

  const data = await financeService.getReport(
    req.userId!,
    input.filter,
    input.date ? new Date(`${input.date}T00:00:00.000Z`) : new Date(),
  );

  res.json({ success: true, data });
};

export const resetFinanceData: RequestHandler = async (req, res) => {
  const data = await financeService.resetFinanceData(req.userId!);

  res.status(200).json({
    success: true,
    data,
  });
};

export const updateFinanceSettings: RequestHandler = async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    throw new ApiError(401, "Authentication required.");
  }

  const input = updateFinanceSettingsSchema.parse(req.body);

  const result = await financeService.updateFinanceSettings(userId, input);

  res.json({
    success: true,
    data: result,
  });
};
