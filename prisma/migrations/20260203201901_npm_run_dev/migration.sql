-- CreateTable
CREATE TABLE "ClinicalVisit" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicalVisit_clinicId_doctorId_startedAt_idx" ON "ClinicalVisit"("clinicId", "doctorId", "startedAt");

-- CreateIndex
CREATE INDEX "ClinicalVisit_clinicId_patientId_startedAt_idx" ON "ClinicalVisit"("clinicId", "patientId", "startedAt");

-- AddForeignKey
ALTER TABLE "ClinicalVisit" ADD CONSTRAINT "ClinicalVisit_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalVisit" ADD CONSTRAINT "ClinicalVisit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalVisit" ADD CONSTRAINT "ClinicalVisit_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalVisit" ADD CONSTRAINT "ClinicalVisit_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
