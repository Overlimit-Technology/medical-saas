-- CreateEnum
CREATE TYPE "ObservationStatus" AS ENUM ('PRELIMINARY', 'FINAL', 'AMENDED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "ObservationValueType" AS ENUM ('STRING', 'QUANTITY', 'BOOLEAN');

-- CreateTable
CREATE TABLE "Observation" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "clinicalVisitId" TEXT,
    "status" "ObservationStatus" NOT NULL DEFAULT 'FINAL',
    "code" TEXT NOT NULL,
    "codeSystem" TEXT NOT NULL,
    "codeDisplay" TEXT,
    "categoryCode" TEXT,
    "categorySystem" TEXT,
    "categoryDisplay" TEXT,
    "valueType" "ObservationValueType" NOT NULL,
    "valueString" TEXT,
    "valueQuantity" DOUBLE PRECISION,
    "valueBoolean" BOOLEAN,
    "valueUnit" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Observation_clinicId_patientId_effectiveAt_idx"
ON "Observation"("clinicId", "patientId", "effectiveAt");

-- CreateIndex
CREATE INDEX "Observation_clinicId_code_effectiveAt_idx"
ON "Observation"("clinicId", "code", "effectiveAt");

-- CreateIndex
CREATE INDEX "Observation_doctorId_effectiveAt_idx"
ON "Observation"("doctorId", "effectiveAt");

-- CreateIndex
CREATE INDEX "Observation_clinicalVisitId_effectiveAt_idx"
ON "Observation"("clinicalVisitId", "effectiveAt");

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_doctorId_fkey"
FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_clinicalVisitId_fkey"
FOREIGN KEY ("clinicalVisitId") REFERENCES "ClinicalVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
