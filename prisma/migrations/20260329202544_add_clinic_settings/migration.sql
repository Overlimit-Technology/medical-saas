-- CreateTable
CREATE TABLE "ClinicSettings" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "statusColors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicSettings_clinicId_key" ON "ClinicSettings"("clinicId");

-- AddForeignKey
ALTER TABLE "ClinicSettings" ADD CONSTRAINT "ClinicSettings_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
