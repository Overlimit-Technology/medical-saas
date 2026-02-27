-- CreateEnum
CREATE TYPE "InternalAlertType" AS ENUM (
    'APPOINTMENT_CREATED',
    'APPOINTMENT_RESCHEDULED',
    'APPOINTMENT_CANCELLED',
    'APPOINTMENT_CONFLICT',
    'PAYMENT_PENDING',
    'CUSTOM'
);

-- CreateEnum
CREATE TYPE "InternalAlertDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "InternalAlert" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "doctorId" TEXT,
    "eventType" "InternalAlertType" NOT NULL DEFAULT 'CUSTOM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalAlertRecipient" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deliveryStatus" "InternalAlertDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryError" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalAlertRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternalAlert_clinicId_createdAt_idx" ON "InternalAlert"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "InternalAlert_createdById_createdAt_idx" ON "InternalAlert"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "InternalAlert_doctorId_createdAt_idx" ON "InternalAlert"("doctorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InternalAlertRecipient_alertId_userId_key" ON "InternalAlertRecipient"("alertId", "userId");

-- CreateIndex
CREATE INDEX "InternalAlertRecipient_userId_readAt_createdAt_idx" ON "InternalAlertRecipient"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "InternalAlertRecipient_deliveryStatus_createdAt_idx" ON "InternalAlertRecipient"("deliveryStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "InternalAlert" ADD CONSTRAINT "InternalAlert_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalAlert" ADD CONSTRAINT "InternalAlert_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalAlert" ADD CONSTRAINT "InternalAlert_doctorId_fkey"
FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalAlertRecipient" ADD CONSTRAINT "InternalAlertRecipient_alertId_fkey"
FOREIGN KEY ("alertId") REFERENCES "InternalAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalAlertRecipient" ADD CONSTRAINT "InternalAlertRecipient_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
