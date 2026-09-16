import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { toNumber } from "../utils/decimal.js";
import {
  convertConfiguredAmount,
  getPeriodRange,
  type ReportFilter,
} from "../utils/period.js";
import { UpdateFinanceSettingsInput } from "../validators/finance.schemas.js";

const fundTypeMap = {
  savings: "SAVINGS",
  emergency: "EMERGENCY",
  luxe: "LUXE",
} as const;

const sourceMap = {
  manual: "MANUAL",
  receipt: "RECEIPT",
} as const;

type SaveBudgetInput = {
  income: number;
  currency: "USD" | "PHP";
  period: "weekly" | "monthly";

  monthlyStartDay: number;
  weeklyStartDay: number;

  categories: Array<{
    id?: string;
    name: string;
    limit: number;
    icon?: string;
    color?: string;
    sortOrder?: number;
  }>;

  funds: Array<{
    type: "savings" | "emergency" | "luxe";
    name: string;
    percentage: number;
  }>;
};

type CreateExpenseInput = {
  title: string;
  amount: number;
  categoryId: string;
  expenseDate?: string;
  source: "manual" | "receipt";
  receiptId?: string;
  merchant?: string;
  notes?: string;
  paymentMethod?: string;
};

type UpdateExpenseInput = {
  title?: string;
  amount?: number;
  categoryId?: string;
  expenseDate?: string;
  source?: "manual" | "receipt";
  receiptId?: string | null;
  merchant?: string | null;
  notes?: string | null;
  paymentMethod?: string | null;
};

type ListExpensesInput = {
  filter: ReportFilter;
  referenceDate?: Date;
  categoryId?: string;
  page: number;
  pageSize: number;
};

/**
 * Returns the user's core finance profile.
 *
 * Category `spent` values are not returned here because they should be
 * calculated from actual expenses for the requested reporting period.
 */
async function serializeProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    include: {
      profile: true,

      categories: {
        where: {
          isActive: true,
        },

        orderBy: {
          sortOrder: "asc",
        },
      },

      funds: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (!user.profile) {
    throw new ApiError(404, "Finance profile not found.");
  }

  return {
    income: toNumber(user.profile.income),

    currency: user.profile.currency,

    period: user.profile.period.toLowerCase() as "weekly" | "monthly",

    monthlyStartDay: user.profile.monthlyStartDay,

    weeklyStartDay: user.profile.weeklyStartDay,

    categories: user.categories.map((category) => ({
      id: category.id,
      name: category.name,
      limit: toNumber(category.limit),
      icon: category.icon,
      color: category.color,
      sortOrder: category.sortOrder,
    })),

    funds: user.funds.map((fund) => ({
      id: fund.id,

      type: fund.type.toLowerCase() as "savings" | "emergency" | "luxe",

      name: fund.name,
      percentage: fund.percentage,
    })),
  };
}

/**
 * Ensures that an expense category belongs to the authenticated user.
 */
async function findOwnedCategory(userId: string, categoryId: string) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
      isActive: true,
    },
  });

  if (!category) {
    throw new ApiError(404, "Expense category not found.");
  }

  return category;
}

/**
 * Ensures that a receipt belongs to the authenticated user.
 */
async function validateOwnedReceipt(userId: string, receiptId: string) {
  const receipt = await prisma.receipt.findFirst({
    where: {
      id: receiptId,
      userId,
    },
  });

  if (!receipt) {
    throw new ApiError(404, "Receipt not found.");
  }

  return receipt;
}

export const financeService = {
  /**
   * GET /api/finance/profile
   */
  async getProfile(userId: string) {
    return serializeProfile(userId);
  },

  /**
   * PUT /api/finance/profile
   *
   * Saves the profile, categories, schedule, and savings allocation
   * in one database transaction.
   */
  async saveBudget(userId: string, input: SaveBudgetInput) {
    const totalCategoryBudget = input.categories.reduce(
      (total, category) => total + category.limit,
      0,
    );

    const totalFundPercentage = input.funds.reduce(
      (total, fund) => total + fund.percentage,
      0,
    );

    if (input.income < 0) {
      throw new ApiError(422, "Income cannot be negative.");
    }

    if (input.monthlyStartDay < 1 || input.monthlyStartDay > 28) {
      throw new ApiError(422, "Monthly start day must be between 1 and 28.");
    }

    if (input.weeklyStartDay < 0 || input.weeklyStartDay > 6) {
      throw new ApiError(422, "Weekly start day must be between 0 and 6.");
    }

    if (totalCategoryBudget > input.income) {
      throw new ApiError(422, "Category budget cannot exceed income.", {
        income: input.income,
        totalCategoryBudget,
        overallocatedBy: totalCategoryBudget - input.income,
      });
    }

    if (totalFundPercentage !== 100) {
      throw new ApiError(422, "Savings fund percentages must total 100%.", {
        totalFundPercentage,
      });
    }

    const normalizedCategoryNames = input.categories.map((category) =>
      category.name.trim().toLowerCase(),
    );

    if (
      new Set(normalizedCategoryNames).size !== normalizedCategoryNames.length
    ) {
      throw new ApiError(422, "Category names must be unique.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.financeProfile.upsert({
        where: {
          userId,
        },

        update: {
          income: input.income,
          currency: input.currency,

          period: input.period === "weekly" ? "WEEKLY" : "MONTHLY",

          monthlyStartDay: input.monthlyStartDay,

          weeklyStartDay: input.weeklyStartDay,
        },

        create: {
          userId,
          income: input.income,
          currency: input.currency,

          period: input.period === "weekly" ? "WEEKLY" : "MONTHLY",

          monthlyStartDay: input.monthlyStartDay,

          weeklyStartDay: input.weeklyStartDay,
        },
      });

      const existingCategories = await tx.category.findMany({
        where: {
          userId,
        },
      });

      const existingCategoryIds = new Set(
        existingCategories.map((category) => category.id),
      );

      const submittedCategoryIds = new Set<string>();

      for (let index = 0; index < input.categories.length; index += 1) {
        const category = input.categories[index];

        if (!category) {
          continue;
        }

        const categoryData = {
          name: category.name.trim(),
          limit: category.limit,
          icon: category.icon,
          color: category.color,

          sortOrder: category.sortOrder ?? index + 1,

          isActive: true,
        };

        if (category.id) {
          if (!existingCategoryIds.has(category.id)) {
            throw new ApiError(
              403,
              "One or more categories do not belong to this user.",
            );
          }

          submittedCategoryIds.add(category.id);

          await tx.category.update({
            where: {
              id: category.id,
            },

            data: categoryData,
          });
        } else {
          const createdCategory = await tx.category.create({
            data: {
              userId,
              ...categoryData,
            },
          });

          submittedCategoryIds.add(createdCategory.id);
        }
      }

      /*
       * Categories removed from the submitted budget are deactivated
       * instead of deleted, preserving historical expense records.
       */
      const categoryIdsToDeactivate = existingCategories
        .filter((category) => !submittedCategoryIds.has(category.id))
        .map((category) => category.id);

      if (categoryIdsToDeactivate.length > 0) {
        await tx.category.updateMany({
          where: {
            userId,

            id: {
              in: categoryIdsToDeactivate,
            },
          },

          data: {
            isActive: false,
          },
        });
      }

      for (const fund of input.funds) {
        await tx.fundAllocation.upsert({
          where: {
            userId_type: {
              userId,
              type: fundTypeMap[fund.type],
            },
          },

          update: {
            name: fund.name.trim(),
            percentage: fund.percentage,
          },

          create: {
            userId,
            type: fundTypeMap[fund.type],
            name: fund.name.trim(),
            percentage: fund.percentage,
          },
        });
      }
    });

    return serializeProfile(userId);
  },

  /**
   * POST /api/finance/expenses
   */
  async createExpense(userId: string, input: CreateExpenseInput) {
    const category = await findOwnedCategory(userId, input.categoryId);

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new ApiError(422, "Expense amount must be greater than zero.");
    }

    if (input.receiptId) {
      await validateOwnedReceipt(userId, input.receiptId);

      const existingReceiptExpense = await prisma.expense.findUnique({
        where: {
          receiptId: input.receiptId,
        },
      });

      if (existingReceiptExpense) {
        throw new ApiError(
          409,
          "This receipt is already attached to another expense.",
        );
      }
    }

    const expenseDate = input.expenseDate
      ? new Date(input.expenseDate)
      : new Date();

    if (Number.isNaN(expenseDate.getTime())) {
      throw new ApiError(422, "Expense date is invalid.");
    }

    return prisma.expense.create({
      data: {
        userId,
        categoryId: category.id,

        receiptId: input.receiptId,

        title: input.title.trim(),

        amount: input.amount,

        expenseDate,

        source: sourceMap[input.source],

        merchant: input.merchant?.trim(),

        notes: input.notes?.trim(),

        paymentMethod: input.paymentMethod?.trim(),
      },

      include: {
        category: true,
        receipt: true,
      },
    });
  },

  /**
   * GET /api/finance/expenses
   *
   * Lists expenses using the user's custom weekly/monthly schedule.
   */
  async listExpenses(userId: string, input: ListExpensesInput) {
    const profile = await prisma.financeProfile.findUnique({
      where: {
        userId,
      },
    });

    if (!profile) {
      throw new ApiError(404, "Finance profile not found.");
    }

    const referenceDate = input.referenceDate ?? new Date();

    const { start, end } = getPeriodRange(input.filter, referenceDate, {
      monthlyStartDay: profile.monthlyStartDay,

      weeklyStartDay: profile.weeklyStartDay,
    });

    if (input.categoryId) {
      await findOwnedCategory(userId, input.categoryId);
    }

    const page = Math.max(input.page, 1);

    const pageSize = Math.min(Math.max(input.pageSize, 1), 100);

    const where = {
      userId,

      expenseDate: {
        gte: start,
        lt: end,
      },

      ...(input.categoryId
        ? {
            categoryId: input.categoryId,
          }
        : {}),
    };

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,

        include: {
          category: true,
          receipt: true,
        },

        orderBy: [
          {
            expenseDate: "desc",
          },
          {
            createdAt: "desc",
          },
        ],

        skip: (page - 1) * pageSize,

        take: pageSize,
      }),

      prisma.expense.count({
        where,
      }),
    ]);

    return {
      items: expenses.map((expense) => ({
        id: expense.id,
        title: expense.title,
        amount: toNumber(expense.amount),

        categoryId: expense.categoryId,

        categoryName: expense.category.name,

        date: expense.expenseDate.toISOString(),

        source: expense.source.toLowerCase() as "manual" | "receipt",

        merchant: expense.merchant,

        notes: expense.notes,

        paymentMethod: expense.paymentMethod,

        receiptId: expense.receiptId,
      })),

      pagination: {
        page,
        pageSize,
        total,

        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      },

      period: {
        filter: input.filter,
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };
  },

  /**
   * PATCH /api/finance/expenses/:id
   */
  async updateExpense(
    userId: string,
    expenseId: string,
    input: UpdateExpenseInput,
  ) {
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        userId,
      },
    });

    if (!existingExpense) {
      throw new ApiError(404, "Expense not found.");
    }

    if (input.categoryId) {
      await findOwnedCategory(userId, input.categoryId);
    }

    if (
      input.amount !== undefined &&
      (!Number.isFinite(input.amount) || input.amount <= 0)
    ) {
      throw new ApiError(422, "Expense amount must be greater than zero.");
    }

    if (input.receiptId !== undefined && input.receiptId !== null) {
      await validateOwnedReceipt(userId, input.receiptId);

      const existingReceiptExpense = await prisma.expense.findFirst({
        where: {
          receiptId: input.receiptId,

          id: {
            not: expenseId,
          },
        },
      });

      if (existingReceiptExpense) {
        throw new ApiError(
          409,
          "This receipt is already attached to another expense.",
        );
      }
    }

    let parsedExpenseDate: Date | undefined;

    if (input.expenseDate) {
      parsedExpenseDate = new Date(input.expenseDate);

      if (Number.isNaN(parsedExpenseDate.getTime())) {
        throw new ApiError(422, "Expense date is invalid.");
      }
    }

    return prisma.expense.update({
      where: {
        id: expenseId,
      },

      data: {
        title: input.title?.trim(),

        amount: input.amount,

        categoryId: input.categoryId,

        expenseDate: parsedExpenseDate,

        source: input.source ? sourceMap[input.source] : undefined,

        receiptId: input.receiptId,

        merchant: input.merchant === null ? null : input.merchant?.trim(),

        notes: input.notes === null ? null : input.notes?.trim(),

        paymentMethod:
          input.paymentMethod === null ? null : input.paymentMethod?.trim(),
      },

      include: {
        category: true,
        receipt: true,
      },
    });
  },

  /**
   * DELETE /api/finance/expenses/:id
   */
  async deleteExpense(userId: string, expenseId: string) {
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        userId,
      },
    });

    if (!existingExpense) {
      throw new ApiError(404, "Expense not found.");
    }

    await prisma.expense.delete({
      where: {
        id: expenseId,
      },
    });
  },

  /**
   * GET /api/finance/reports/summary
   *
   * Actual expenses are selected from expenseDate.
   * Income and budget limits are converted into the requested view.
   */
  async getReport(
    userId: string,
    filter: ReportFilter,
    referenceDate = new Date(),
  ) {
    const [profile, categories, funds] = await Promise.all([
      prisma.financeProfile.findUnique({
        where: {
          userId,
        },
      }),

      prisma.category.findMany({
        where: {
          userId,
          isActive: true,
        },

        orderBy: {
          sortOrder: "asc",
        },
      }),

      prisma.fundAllocation.findMany({
        where: {
          userId,
        },

        orderBy: {
          createdAt: "asc",
        },
      }),
    ]);

    if (!profile) {
      throw new ApiError(404, "Finance profile not found.");
    }

    const { start, end } = getPeriodRange(filter, referenceDate, {
      monthlyStartDay: profile.monthlyStartDay,

      weeklyStartDay: profile.weeklyStartDay,
    });

    const groupedExpenses = await prisma.expense.groupBy({
      by: ["categoryId"],

      where: {
        userId,

        expenseDate: {
          gte: start,
          lt: end,
        },
      },

      _sum: {
        amount: true,
      },
    });

    const spentByCategory = new Map<string, number>(
      groupedExpenses.map((expense) => [
        expense.categoryId,
        toNumber(expense._sum.amount),
      ]),
    );

    const income = convertConfiguredAmount(
      toNumber(profile.income),
      profile.period,
      filter,
    );

    const categoryBreakdown = categories.map((category) => {
      const limit = convertConfiguredAmount(
        toNumber(category.limit),
        profile.period,
        filter,
      );

      const spent = spentByCategory.get(category.id) ?? 0;

      return {
        id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,

        limit: Number(limit.toFixed(2)),

        spent: Number(spent.toFixed(2)),

        remaining: Number((limit - spent).toFixed(2)),

        percentage: limit > 0 ? Math.round((spent / limit) * 100) : 0,
      };
    });

    const totalBudget = categoryBreakdown.reduce(
      (total, category) => total + category.limit,
      0,
    );

    const totalExpenses = categoryBreakdown.reduce(
      (total, category) => total + category.spent,
      0,
    );

    const plannedSavings = Math.max(income - totalBudget, 0);

    const remainingBalance = income - plannedSavings - totalExpenses;

    const savingsAllocation = funds.map((fund) => ({
      id: fund.id,

      type: fund.type.toLowerCase(),

      name: fund.name,

      percentage: fund.percentage,

      amount: Number((plannedSavings * (fund.percentage / 100)).toFixed(2)),
    }));

    return {
      filter,

      period: {
        start: start.toISOString(),
        end: end.toISOString(),

        monthlyStartDay: profile.monthlyStartDay,

        weeklyStartDay: profile.weeklyStartDay,
      },

      income: Number(income.toFixed(2)),

      totalBudget: Number(totalBudget.toFixed(2)),

      totalExpenses: Number(totalExpenses.toFixed(2)),

      plannedSavings: Number(plannedSavings.toFixed(2)),

      remainingBalance: Number(remainingBalance.toFixed(2)),

      budgetUsed:
        totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0,

      categoryBreakdown,
      savingsAllocation,
    };
  },

  /**
   * DELETE /api/finance/reset
   *
   * Deletes finance-related history while preserving the user account.
   */
  async resetFinanceData(userId: string) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    await prisma.$transaction(async (tx) => {
      /*
       * Alerts reference categories, so alerts must be removed first.
       */
      await tx.budgetAlert.deleteMany({
        where: {
          userId,
        },
      });

      /*
       * Expenses may reference receipts and categories.
       */
      await tx.expense.deleteMany({
        where: {
          userId,
        },
      });

      await tx.receipt.deleteMany({
        where: {
          userId,
        },
      });

      await tx.category.deleteMany({
        where: {
          userId,
        },
      });

      await tx.financeProfile.upsert({
        where: {
          userId,
        },

        update: {
          income: 0,
          currency: "USD",
          period: "MONTHLY",
          monthlyStartDay: 1,
          weeklyStartDay: 1,
        },

        create: {
          userId,
          income: 0,
          currency: "USD",
          period: "MONTHLY",
          monthlyStartDay: 1,
          weeklyStartDay: 1,
        },
      });

      await tx.fundAllocation.upsert({
        where: {
          userId_type: {
            userId,
            type: "SAVINGS",
          },
        },

        update: {
          name: "Savings",
          percentage: 50,
        },

        create: {
          userId,
          type: "SAVINGS",
          name: "Savings",
          percentage: 50,
        },
      });

      await tx.fundAllocation.upsert({
        where: {
          userId_type: {
            userId,
            type: "EMERGENCY",
          },
        },

        update: {
          name: "Emergency Fund",
          percentage: 35,
        },

        create: {
          userId,
          type: "EMERGENCY",
          name: "Emergency Fund",
          percentage: 35,
        },
      });

      await tx.fundAllocation.upsert({
        where: {
          userId_type: {
            userId,
            type: "LUXE",
          },
        },

        update: {
          name: "Luxe Fund",
          percentage: 15,
        },

        create: {
          userId,
          type: "LUXE",
          name: "Luxe Fund",
          percentage: 15,
        },
      });
    });

    return serializeProfile(userId);
  },
  async updateFinanceSettings(
    userId: string,
    input: UpdateFinanceSettingsInput,
  ) {
    const profile = await prisma.financeProfile.findUnique({
      where: {
        userId,
      },
    });

    if (!profile) {
      throw new ApiError(404, "Finance profile not found.");
    }

    const updatedProfile = await prisma.financeProfile.update({
      where: {
        userId,
      },

      data: {
        currency: input.currency,

        period:
          input.period === undefined
            ? undefined
            : input.period === "weekly"
              ? "WEEKLY"
              : "MONTHLY",

        monthlyStartDay: input.monthlyStartDay,

        weeklyStartDay: input.weeklyStartDay,
      },
    });

    return {
      id: updatedProfile.id,
      income: Number(updatedProfile.income),

      currency: updatedProfile.currency,

      period: updatedProfile.period === "WEEKLY" ? "weekly" : "monthly",

      monthlyStartDay: updatedProfile.monthlyStartDay,

      weeklyStartDay: updatedProfile.weeklyStartDay,
    };
  },
};
