-- AlterTable
ALTER TABLE "FinanceProfile" ADD COLUMN     "monthlyStartDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "weeklyStartDay" INTEGER NOT NULL DEFAULT 1;
