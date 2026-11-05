-- Ficha por especialidad: tipos de atencion, PIN clinico, registro de accesos (Ley 20.584),
-- consentimientos y anamnesis general cifrada. Migracion aditiva: no toca datos existentes.

ALTER TABLE "User" ADD COLUMN "clinicalPinHash" TEXT;
ALTER TABLE "User" ADD COLUMN "clinicalPinSetAt" TIMESTAMP(3);

ALTER TABLE "Appointment" ADD COLUMN "attentionTypeKey" TEXT;

ALTER TABLE "ClinicalVisit" ADD COLUMN "attentionTypeKey" TEXT;
ALTER TABLE "ClinicalVisit" ADD COLUMN "attentionSnapshot" JSONB;
ALTER TABLE "ClinicalVisit" ADD COLUMN "noteFormat" TEXT;

CREATE TABLE "AttentionType" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'other',
    "blocks" JSONB NOT NULL,
    "fields" JSONB NOT NULL,
    "noteFormat" TEXT NOT NULL DEFAULT 'free',
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "color" TEXT NOT NULL DEFAULT '#50c9d5',
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AttentionType_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AttentionType_clinicId_profession_idx" ON "AttentionType"("clinicId", "profession");
CREATE INDEX "AttentionType_ownerUserId_idx" ON "AttentionType"("ownerUserId");

CREATE TABLE "AttentionTypePref" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "typeKey" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AttentionTypePref_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AttentionTypePref_userId_typeKey_key" ON "AttentionTypePref"("userId", "typeKey");

CREATE TABLE "ClinicalAccessLog" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClinicalAccessLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClinicalAccessLog_clinicId_patientId_occurredAt_idx" ON "ClinicalAccessLog"("clinicId", "patientId", "occurredAt");
CREATE INDEX "ClinicalAccessLog_userId_occurredAt_idx" ON "ClinicalAccessLog"("userId", "occurredAt");

CREATE TABLE "PatientConsent" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "textSnapshot" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signature" TEXT,
    "recordedById" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "PatientConsent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PatientConsent_clinicId_patientId_scope_idx" ON "PatientConsent"("clinicId", "patientId", "scope");

CREATE TABLE "PatientBackground" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PatientBackground_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PatientBackground_patientId_key" ON "PatientBackground"("patientId");
