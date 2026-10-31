-- Portal del paciente por sede: /portal/{portalSlug}, cuentas de pacientes y codigos de verificacion por correo.
ALTER TABLE "ClinicSettings" ADD COLUMN "portalSlug" TEXT;
ALTER TABLE "ClinicSettings" ADD COLUMN "portalEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "ClinicSettings_portalSlug_key" ON "ClinicSettings"("portalSlug");

CREATE TABLE "PatientAccount" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PatientAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PatientAccount_patientId_key" ON "PatientAccount"("patientId");
CREATE UNIQUE INDEX "PatientAccount_clinicId_email_key" ON "PatientAccount"("clinicId", "email");
ALTER TABLE "PatientAccount" ADD CONSTRAINT "PatientAccount_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientAccount" ADD CONSTRAINT "PatientAccount_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PatientPortalCode" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "runNormalized" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatientPortalCode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PatientPortalCode_clinicId_runNormalized_createdAt_idx" ON "PatientPortalCode"("clinicId", "runNormalized", "createdAt");
ALTER TABLE "PatientPortalCode" ADD CONSTRAINT "PatientPortalCode_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
