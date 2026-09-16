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
    const { start, end, periodKey } = getPeriodRange(filter, expenseDate, {
      monthlyStartDay: profile.monthlyStartDay,
      weeklyStartDay: profile.weeklyStartDay
    });

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
    const remaining = Math.max(limit - spent, 0);
    const overage = Math.max(spent - limit, 0);
    const currencySymbol = profile.currency === "PHP" ? "₱" : "$";
    const formatAmount = (amount: number) =>
      `${currencySymbol}${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
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
        title:
          spent > limit
            ? "Budget exceeded"
            : spent === limit
              ? "Budget limit reached"
              : "Budget warning",
        body:
          spent > limit
            ? `${category.name} is ${formatAmount(overage)} over its budget (${percentage}% used).`
            : spent === limit
              ? `${category.name} has reached its ${formatAmount(limit)} budget limit.`
              : `${category.name} is at ${percentage}% with ${formatAmount(remaining)} remaining.`,
        categoryId,
        percentage
      });
    }

    return alerts;
  }
};
