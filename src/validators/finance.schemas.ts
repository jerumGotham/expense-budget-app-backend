import { z } from "zod";

export const budgetPeriodSchema = z.enum(["weekly", "monthly"]);

export const currencySchema = z.enum(["USD", "PHP"]);

export const saveBudgetSchema = z.object({
  income: z.number().nonnegative(),

  currency: currencySchema,

  period: budgetPeriodSchema,

  monthlyStartDay: z.number().int().min(1).max(28),

  weeklyStartDay: z.number().int().min(0).max(6),

  categories: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().trim().min(1).max(60),
      limit: z.number().nonnegative(),
      icon: z.string().max(20).optional(),
      color: z.string().max(20).optional(),
      sortOrder: z.number().int().nonnegative().optional(),
    }),
  ),

  funds: z
    .array(
      z.object({
        type: z.enum(["savings", "emergency", "luxe"]),
        name: z.string().trim().min(1).max(60),
        percentage: z.number().int().min(0).max(100),
      }),
    )
    .length(3)
    .refine(
      (funds) =>
        funds.reduce((total, fund) => total + fund.percentage, 0) === 100,
      {
        message: "Fund percentages must total 100.",
      },
    ),
});

export const createExpenseSchema = z.object({
  title: z.string().trim().min(1).max(120),

  amount: z.number().positive(),

  categoryId: z.string().min(1),

  expenseDate: z.iso.datetime().optional(),

  source: z.enum(["manual", "receipt"]).default("manual"),

  receiptId: z.string().optional(),
  merchant: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
  paymentMethod: z.string().trim().max(60).optional(),
});

export const updateExpenseSchema = createExpenseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const reportQuerySchema = z.object({
  filter: z.enum(["weekly", "monthly", "yearly"]).default("monthly"),

  date: z.iso.date().optional(),
});

export const pushTokenSchema = z.object({
  token: z.string().min(10),
  platform: z.string().max(30).optional(),
});

export const updateFinanceSettingsSchema = z
  .object({
    currency: z.enum(["USD", "PHP"]).optional(),

    period: z.enum(["weekly", "monthly"]).optional(),

    monthlyStartDay: z.number().int().min(1).max(28).optional(),

    weeklyStartDay: z.number().int().min(0).max(6).optional(),
  })
  .refine(
    (data) =>
      data.currency !== undefined ||
      data.period !== undefined ||
      data.monthlyStartDay !== undefined ||
      data.weeklyStartDay !== undefined,
    {
      message: "Provide at least one finance setting to update.",
    },
  );

export type UpdateFinanceSettingsInput = z.infer<
  typeof updateFinanceSettingsSchema
>;
