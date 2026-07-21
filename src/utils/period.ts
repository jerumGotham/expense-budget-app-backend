import type { BudgetPeriod } from "../../generated/prisma/client.js";

export type ReportFilter = "weekly" | "monthly" | "yearly";

type PeriodOptions = {
  monthlyStartDay?: number;
  weeklyStartDay?: number;
};

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addDays(date: Date, numberOfDays: number): Date {
  const result = new Date(date);

  result.setUTCDate(result.getUTCDate() + numberOfDays);

  return result;
}

function createUtcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

export function getPeriodRange(
  filter: ReportFilter,
  referenceDate = new Date(),
  options: PeriodOptions = {},
): {
  start: Date;
  end: Date;
  periodKey: string;
} {
  const reference = startOfUtcDay(referenceDate);

  if (filter === "weekly") {
    return getWeeklyRange(reference, options.weeklyStartDay ?? 1);
  }

  if (filter === "monthly") {
    return getMonthlyRange(reference, options.monthlyStartDay ?? 1);
  }

  const start = createUtcDate(reference.getUTCFullYear(), 0, 1);

  const end = createUtcDate(reference.getUTCFullYear() + 1, 0, 1);

  return {
    start,
    end,
    periodKey: `Y:${reference.getUTCFullYear()}`,
  };
}

function getWeeklyRange(
  referenceDate: Date,
  weeklyStartDay: number,
): {
  start: Date;
  end: Date;
  periodKey: string;
} {
  const safeStartDay = Math.min(Math.max(weeklyStartDay, 0), 6);

  const currentWeekDay = referenceDate.getUTCDay();

  const daysSinceStart = (currentWeekDay - safeStartDay + 7) % 7;

  const start = addDays(referenceDate, -daysSinceStart);

  const end = addDays(start, 7);

  return {
    start,
    end,
    periodKey: `W:${start.toISOString().slice(0, 10)}`,
  };
}

function getMonthlyRange(
  referenceDate: Date,
  monthlyStartDay: number,
): {
  start: Date;
  end: Date;
  periodKey: string;
} {
  const safeStartDay = Math.min(Math.max(monthlyStartDay, 1), 28);

  const year = referenceDate.getUTCFullYear();

  const month = referenceDate.getUTCMonth();

  const currentDay = referenceDate.getUTCDate();

  const start =
    currentDay >= safeStartDay
      ? createUtcDate(year, month, safeStartDay)
      : createUtcDate(year, month - 1, safeStartDay);

  const end = createUtcDate(
    start.getUTCFullYear(),
    start.getUTCMonth() + 1,
    safeStartDay,
  );

  return {
    start,
    end,
    periodKey: `M:${start.toISOString().slice(0, 10)}`,
  };
}

export function getCurrentBudgetRange(
  period: BudgetPeriod,
  monthlyStartDay: number,
  weeklyStartDay: number,
  referenceDate = new Date(),
) {
  return getPeriodRange(
    period === "WEEKLY" ? "weekly" : "monthly",
    referenceDate,
    {
      monthlyStartDay,
      weeklyStartDay,
    },
  );
}

export function convertConfiguredAmount(
  value: number,
  sourcePeriod: BudgetPeriod,
  target: ReportFilter,
): number {
  if (sourcePeriod === "WEEKLY") {
    if (target === "weekly") {
      return value;
    }

    if (target === "monthly") {
      return value * (52 / 12);
    }

    return value * 52;
  }

  if (target === "weekly") {
    return value * (12 / 52);
  }

  if (target === "monthly") {
    return value;
  }

  return value * 12;
}
