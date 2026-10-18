-- Boletas de honorarios mensuales de los profesionales hacia la clinica.
CREATE TYPE "ProfessionalInvoiceStatus" AS ENUM ('PENDING', 'ISSUED', 'PAID', 'CANCELLED');

-- Receptor de la boleta (razon social y RUT de la empresa).
ALTER TABLE "Clinic" ADD COLUMN "legalName" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "taxId" TEXT;

-- Delegacion del SII: hasta cuando la clinica puede emitir la boleta en nombre del profesional.
ALTER TABLE "DoctorProfile" ADD COLUMN "siiDelegationUntil" TIMESTAMP(3);

CREATE TABLE "ProfessionalInvoice" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "clinicPercentage" DECIMAL(5,2) NOT NULL,
    "clinicRetentionAmount" DECIMAL(12,2) NOT NULL,
    "baseAmount" DECIMAL(12,2) NOT NULL,
    "siiPercentage" DECIMAL(5,2) NOT NULL,
    "siiRetentionAmount" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "status" "ProfessionalInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "invoiceNumber" TEXT,
    "issuedAt" TIMESTAMP(3),
    "issuedByUserId" TEXT,
    "paidAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfessionalInvoice_clinicId_doctorId_month_key" ON "ProfessionalInvoice"("clinicId", "doctorId", "month");
CREATE INDEX "ProfessionalInvoice_clinicId_month_idx" ON "ProfessionalInvoice"("clinicId", "month");
CREATE INDEX "ProfessionalInvoice_doctorId_status_idx" ON "ProfessionalInvoice"("doctorId", "status");

ALTER TABLE "ProfessionalInvoice" ADD CONSTRAINT "ProfessionalInvoice_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalInvoice" ADD CONSTRAINT "ProfessionalInvoice_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
