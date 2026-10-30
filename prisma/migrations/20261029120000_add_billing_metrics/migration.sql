-- CreateEnum
CREATE TYPE "ClinicBillingStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- AlterTable
ALTER TABLE "Clinic"
  ADD COLUMN "billingStatus" "ClinicBillingStatus" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN "planName" TEXT,
  ADD COLUMN "monthlyPrice" DECIMAL(12,2),
  ADD COLUMN "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN "subscriptionStartedAt" TIMESTAMP(3),
  ADD COLUMN "canceledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlatformCost" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformCost_month_idx" ON "PlatformCost"("month");
