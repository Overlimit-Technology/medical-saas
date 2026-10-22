-- Marketing del sitio web (zensya.cl): configuracion de pixeles, tests A/B, landings de campana (VSL)
-- y eventos de medicion (visitas, conversiones). Se administra desde /super-admin/marketing.
-- Tablas nuevas: no modifica ninguna tabla existente.

CREATE TABLE "MarketingConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "metaPixelId" TEXT NOT NULL DEFAULT '',
    "ga4Id" TEXT NOT NULL DEFAULT '',
    "googleAdsId" TEXT NOT NULL DEFAULT '',
    "googleAdsLabel" TEXT NOT NULL DEFAULT '',
    "requireConsent" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingConfig_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MarketingConfig_single_row" CHECK ("id" = 1)
);

INSERT INTO "MarketingConfig" ("id") VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE "MarketingExperiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "page" TEXT NOT NULL DEFAULT '/',
    "type" TEXT NOT NULL DEFAULT 'contenido',
    "status" TEXT NOT NULL DEFAULT 'borrador',
    "goal" TEXT NOT NULL DEFAULT 'cualquiera',
    "variants" JSONB NOT NULL DEFAULT '[]',
    "winner" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingExperiment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketingExperiment_status_idx" ON "MarketingExperiment"("status");

CREATE TABLE "MarketingLanding" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "videoUrl" TEXT NOT NULL DEFAULT '',
    "bullets" JSONB NOT NULL DEFAULT '[]',
    "ctaText" TEXT NOT NULL DEFAULT 'Quiero probar Zensya',
    "ctaAction" TEXT NOT NULL DEFAULT 'whatsapp',
    "ctaLink" TEXT NOT NULL DEFAULT '',
    "ctaMessage" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '7 días de prueba gratuita · Sin tarjeta de crédito',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingLanding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketingLanding_slug_key" ON "MarketingLanding"("slug");

CREATE TABLE "MarketingEvent" (
    "id" BIGSERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "label" TEXT,
    "experimentId" TEXT,
    "variant" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "referrer" TEXT,
    "device" TEXT,
    "extra" JSONB,

    CONSTRAINT "MarketingEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketingEvent_createdAt_idx" ON "MarketingEvent"("createdAt");
CREATE INDEX "MarketingEvent_path_createdAt_idx" ON "MarketingEvent"("path", "createdAt");
CREATE INDEX "MarketingEvent_experimentId_variant_idx" ON "MarketingEvent"("experimentId", "variant");
CREATE INDEX "MarketingEvent_visitorId_createdAt_idx" ON "MarketingEvent"("visitorId", "createdAt");
