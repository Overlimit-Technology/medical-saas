-- CreateTable
CREATE TABLE "LeadColumn" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#818cf8',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmLead" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL DEFAULT '',
    "channel" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "sector" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "estimatedBudget" DECIMAL(12,2),
    "mainNote" TEXT NOT NULL DEFAULT '',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "scrapedData" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmLeadNote" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmLeadNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmLeadMessage" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmLeadMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadColumn_clinicId_position_idx" ON "LeadColumn"("clinicId", "position");

-- CreateIndex
CREATE INDEX "CrmLead_clinicId_columnId_idx" ON "CrmLead"("clinicId", "columnId");

-- CreateIndex
CREATE INDEX "CrmLead_clinicId_channel_idx" ON "CrmLead"("clinicId", "channel");

-- CreateIndex
CREATE INDEX "CrmLead_clinicId_createdAt_idx" ON "CrmLead"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "CrmLeadNote_leadId_createdAt_idx" ON "CrmLeadNote"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "CrmLeadMessage_leadId_createdAt_idx" ON "CrmLeadMessage"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "LeadColumn" ADD CONSTRAINT "LeadColumn_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "LeadColumn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLeadNote" ADD CONSTRAINT "CrmLeadNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLeadMessage" ADD CONSTRAINT "CrmLeadMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
