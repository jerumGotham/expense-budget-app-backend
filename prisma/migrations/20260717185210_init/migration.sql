-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'PHP');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "FundType" AS ENUM ('SAVINGS', 'EMERGENCY', 'LUXE');

-- CreateEnum
CREATE TYPE "ExpenseSource" AS ENUM ('MANUAL', 'RECEIPT');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('NEAR_LIMIT', 'OVER_LIMIT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "income" DECIMAL(14,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "period" "BudgetPeriod" NOT NULL DEFAULT 'MONTHLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "limit" DECIMAL(14,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundAllocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "FundType" NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "receiptId" TEXT,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "source" "ExpenseSource" NOT NULL DEFAULT 'MANUAL',
    "merchant" TEXT,
    "notes" TEXT,
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'UPLOADED',
    "extractedTitle" TEXT,
    "extractedAmount" DECIMAL(14,2),
    "extractedDate" TIMESTAMP(3),
    "suggestedCategoryId" TEXT,
    "rawResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "spent" DECIMAL(14,2) NOT NULL,
    "limit" DECIMAL(14,2) NOT NULL,
    "percentage" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceProfile_userId_key" ON "FinanceProfile"("userId");

-- CreateIndex
CREATE INDEX "Category_userId_isActive_idx" ON "Category"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "FundAllocation_userId_type_key" ON "FundAllocation"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_receiptId_key" ON "Expense"("receiptId");

-- CreateIndex
CREATE INDEX "Expense_userId_expenseDate_idx" ON "Expense"("userId", "expenseDate");

-- CreateIndex
CREATE INDEX "Expense_categoryId_expenseDate_idx" ON "Expense"("categoryId", "expenseDate");

-- CreateIndex
CREATE INDEX "Receipt_userId_createdAt_idx" ON "Receipt"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");

-- CreateIndex
CREATE INDEX "BudgetAlert_userId_createdAt_idx" ON "BudgetAlert"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetAlert_userId_categoryId_type_periodKey_key" ON "BudgetAlert"("userId", "categoryId", "type", "periodKey");

-- AddForeignKey
ALTER TABLE "FinanceProfile" ADD CONSTRAINT "FinanceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundAllocation" ADD CONSTRAINT "FundAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAlert" ADD CONSTRAINT "BudgetAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAlert" ADD CONSTRAINT "BudgetAlert_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
