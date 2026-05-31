-- Add CRM operational fields that exist in the current Prisma schema.
ALTER TABLE "CrmLead"
ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "converted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "convertedPatientId" TEXT,
ADD COLUMN "followUpDate" TIMESTAMP(3),
ADD COLUMN "assignedDoctorId" TEXT;

-- CreateTable
CREATE TABLE "CrmLeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmLeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmLead_clinicId_archived_idx" ON "CrmLead"("clinicId", "archived");

-- CreateIndex
CREATE INDEX "CrmLead_clinicId_followUpDate_idx" ON "CrmLead"("clinicId", "followUpDate");

-- CreateIndex
CREATE INDEX "CrmLeadActivity_leadId_createdAt_idx" ON "CrmLeadActivity"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "CashMovement_clinicId_recordedAt_idx" ON "CashMovement"("clinicId", "recordedAt");

-- CreateIndex
CREATE INDEX "CashMovement_clinicId_type_recordedAt_idx" ON "CashMovement"("clinicId", "type", "recordedAt");

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_assignedDoctorId_fkey" FOREIGN KEY ("assignedDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLeadActivity" ADD CONSTRAINT "CrmLeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
