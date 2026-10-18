-- Analisis de IA de cada lead del CRM (prototipo).
ALTER TABLE "CrmLead" ADD COLUMN "aiScore" INTEGER;
ALTER TABLE "CrmLead" ADD COLUMN "aiTemperature" TEXT;
ALTER TABLE "CrmLead" ADD COLUMN "aiSummary" TEXT;
ALTER TABLE "CrmLead" ADD COLUMN "aiNextAction" TEXT;
ALTER TABLE "CrmLead" ADD COLUMN "aiScoredAt" TIMESTAMP(3);
