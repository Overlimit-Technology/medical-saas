-- CreateTable
CREATE TABLE "PatientImaging" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "studyName" TEXT NOT NULL,
    "doctorName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "imageUrl" TEXT,
    "observation" TEXT,
    "studiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientImaging_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientImaging_clinicId_patientId_studiedAt_idx" ON "PatientImaging"("clinicId", "patientId", "studiedAt");

-- AddForeignKey
ALTER TABLE "PatientImaging" ADD CONSTRAINT "PatientImaging_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientImaging" ADD CONSTRAINT "PatientImaging_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
