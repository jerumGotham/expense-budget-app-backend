import { prisma } from "../lib/prisma.js";
import { getPeriodRange } from "../utils/period.js";

export const alertService = {
  async checkCategory(userId: string, categoryId: string, expenseDate: Date) {
    const [category, profile] = await Promise.all([
      prisma.category.findFirst({ where: { id: categoryId, userId } }),
      prisma.financeProfile.findUnique({ where: { userId } })
    ]);

    if (!category || !profile || Number(category.limit) <= 0) return [];

    const filter = profile.period === "WEEKLY" ? "weekly" : "monthly";
    const { start, end, periodKey } = getPeriodRange(filter, expenseDate);

    const aggregate = await prisma.expense.aggregate({
      where: {
        userId,
        categoryId,
        expenseDate: { gte: start, lt: end }
      },
      _sum: { amount: true }
    });

    const spent = Number(aggregate._sum.amount ?? 0);
    const limit = Number(category.limit);
    const percentage = Math.round((spent / limit) * 100);
    const alerts = [];

    if (percentage >= 80) {
      const type = percentage >= 100 ? "OVER_LIMIT" : "NEAR_LIMIT";

      const alert = await prisma.budgetAlert.upsert({
        where: {
          userId_categoryId_type_periodKey: {
            userId,
            categoryId,
            type,
            periodKey
          }
        },
        update: {
          spent,
          limit,
          percentage
        },
        create: {
          userId,
          categoryId,
          type,
          periodKey,
          spent,
          limit,
          percentage
        }
      });

      alerts.push({
        id: alert.id,
        type: type === "OVER_LIMIT" ? "over_limit" : "near_limit",
        title: type === "OVER_LIMIT" ? "Budget exceeded" : "Budget warning",
        body:
          type === "OVER_LIMIT"
            ? `You have used ${percentage}% of your ${category.name} budget.`
            : `You are close to your ${category.name} budget at ${percentage}%.`,
        categoryId,
        percentage
      });
    }

    return alerts;
  }
};
