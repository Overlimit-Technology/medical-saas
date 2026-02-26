-- DropIndex
DROP INDEX "Patient_runNormalized_key";

-- CreateIndex
CREATE UNIQUE INDEX "Patient_clinicId_runNormalized_key" ON "Patient"("clinicId", "runNormalized");
