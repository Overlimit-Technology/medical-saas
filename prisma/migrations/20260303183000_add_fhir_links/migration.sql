-- CreateEnum
CREATE TYPE "FhirLinkResourceType" AS ENUM ('PATIENT', 'APPOINTMENT', 'ENCOUNTER', 'OBSERVATION');

-- CreateTable
CREATE TABLE "FhirLink" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "resourceType" "FhirLinkResourceType" NOT NULL,
    "internalId" TEXT NOT NULL,
    "fhirId" TEXT NOT NULL,
    "identifierSystem" TEXT,
    "identifierValue" TEXT,
    "identifierKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FhirLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FhirLink_clinicId_resourceType_internalId_key"
ON "FhirLink"("clinicId", "resourceType", "internalId");

-- CreateIndex
CREATE UNIQUE INDEX "FhirLink_clinicId_resourceType_fhirId_key"
ON "FhirLink"("clinicId", "resourceType", "fhirId");

-- CreateIndex
CREATE UNIQUE INDEX "FhirLink_clinicId_resourceType_identifierKey_key"
ON "FhirLink"("clinicId", "resourceType", "identifierKey");

-- CreateIndex
CREATE INDEX "FhirLink_clinicId_resourceType_createdAt_idx"
ON "FhirLink"("clinicId", "resourceType", "createdAt");

-- AddForeignKey
ALTER TABLE "FhirLink" ADD CONSTRAINT "FhirLink_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
