-- FormTemplate: per-doctor ownership (nullable = clinic-global)
ALTER TABLE "FormTemplate" ADD COLUMN "ownerDoctorId" TEXT;

ALTER TABLE "FormTemplate"
  ADD CONSTRAINT "FormTemplate_ownerDoctorId_fkey"
  FOREIGN KEY ("ownerDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "FormTemplate_clinicId_name_key";
ALTER TABLE "FormTemplate" DROP CONSTRAINT IF EXISTS "FormTemplate_clinicId_name_key";

CREATE UNIQUE INDEX "FormTemplate_clinicId_ownerDoctorId_name_key"
  ON "FormTemplate"("clinicId", "ownerDoctorId", "name");

CREATE INDEX "FormTemplate_clinicId_ownerDoctorId_idx"
  ON "FormTemplate"("clinicId", "ownerDoctorId");

-- ClinicalRecord: appointmentId optional (allow records assigned only to a patient)
ALTER TABLE "ClinicalRecord" DROP CONSTRAINT IF EXISTS "ClinicalRecord_appointmentId_fkey";
ALTER TABLE "ClinicalRecord" ALTER COLUMN "appointmentId" DROP NOT NULL;
ALTER TABLE "ClinicalRecord"
  ADD CONSTRAINT "ClinicalRecord_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
