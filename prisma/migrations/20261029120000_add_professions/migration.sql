-- Profesiones: catalogo global (clinicId NULL) + profesiones propias de cada sede.
CREATE TABLE IF NOT EXISTS "Profession" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Profession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DoctorProfile" ADD COLUMN IF NOT EXISTS "professionId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Profession_clinicId_slug_key" ON "Profession"("clinicId", "slug");
-- NULL no choca en un unico compuesto: el catalogo global necesita su propio unico por slug.
CREATE UNIQUE INDEX IF NOT EXISTS "Profession_global_slug_key" ON "Profession"("slug") WHERE "clinicId" IS NULL;
CREATE INDEX IF NOT EXISTS "Profession_clinicId_isActive_idx" ON "Profession"("clinicId", "isActive");
CREATE INDEX IF NOT EXISTS "DoctorProfile_professionId_idx" ON "DoctorProfile"("professionId");

ALTER TABLE "Profession" ADD CONSTRAINT "Profession_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_professionId_fkey"
  FOREIGN KEY ("professionId") REFERENCES "Profession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Catalogo global inicial.
INSERT INTO "Profession" ("id", "clinicId", "name", "slug", "updatedAt") VALUES
  ('prof_medico', NULL, 'Médico/a', 'medico', CURRENT_TIMESTAMP),
  ('prof_psicologo', NULL, 'Psicólogo/a', 'psicologo', CURRENT_TIMESTAMP),
  ('prof_psiquiatra', NULL, 'Psiquiatra', 'psiquiatra', CURRENT_TIMESTAMP),
  ('prof_kinesiologo', NULL, 'Kinesiólogo/a', 'kinesiologo', CURRENT_TIMESTAMP),
  ('prof_nutricionista', NULL, 'Nutricionista', 'nutricionista', CURRENT_TIMESTAMP),
  ('prof_fonoaudiologo', NULL, 'Fonoaudiólogo/a', 'fonoaudiologo', CURRENT_TIMESTAMP),
  ('prof_terapeuta_ocupacional', NULL, 'Terapeuta ocupacional', 'terapeuta-ocupacional', CURRENT_TIMESTAMP),
  ('prof_matrona', NULL, 'Matrón/a', 'matron', CURRENT_TIMESTAMP),
  ('prof_enfermero', NULL, 'Enfermero/a', 'enfermero', CURRENT_TIMESTAMP),
  ('prof_dentista', NULL, 'Odontólogo/a', 'odontologo', CURRENT_TIMESTAMP),
  ('prof_podologo', NULL, 'Podólogo/a', 'podologo', CURRENT_TIMESTAMP),
  ('prof_trabajador_social', NULL, 'Trabajador/a social', 'trabajador-social', CURRENT_TIMESTAMP),
  ('prof_psicopedagogo', NULL, 'Psicopedagogo/a', 'psicopedagogo', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Backfill: se enlaza la profesion cuando el texto de `specialty` coincide (sin tildes ni genero) con una del catalogo.
-- Los que no calzan quedan sin profesion y conservan su `specialty` como detalle.
UPDATE "DoctorProfile" d
SET "professionId" = p."id"
FROM "Profession" p
WHERE d."professionId" IS NULL
  AND p."clinicId" IS NULL
  AND d."specialty" IS NOT NULL
  AND regexp_replace(translate(lower(d."specialty"), 'áéíóúñ', 'aeioun'), '[^a-z]', '', 'g')
      ~ ('^(' || CASE p."slug"
          WHEN 'medico' THEN 'medic[oa]|doctor[a]?|medicin[ae]general|medicogeneral'
          WHEN 'psicologo' THEN 'psicolog[oa]'
          WHEN 'psiquiatra' THEN 'psiquiatra'
          WHEN 'kinesiologo' THEN 'kinesiolog[oa]|kinesiterapeuta'
          WHEN 'nutricionista' THEN 'nutricionista'
          WHEN 'fonoaudiologo' THEN 'fonoaudiolog[oa]'
          WHEN 'terapeuta-ocupacional' THEN 'terapeutaocupacional'
          WHEN 'matron' THEN 'matron[a]?'
          WHEN 'enfermero' THEN 'enfermer[oa]'
          WHEN 'odontologo' THEN 'odontolog[oa]|dentista'
          WHEN 'podologo' THEN 'podolog[oa]'
          WHEN 'trabajador-social' THEN 'trabajador[a]?social'
          ELSE 'psicopedagog[oa]' END || ')$');
