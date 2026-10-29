-- ============================================================================
-- MediGest - Cuentas de prueba para los entornos Development y Preview
--
-- Complementa a test-seed-current-month.sql (que debe ejecutarse antes).
-- SOLO datos inventados: nunca ejecutar contra produccion.
--
-- Cuentas (todas usan la misma clave que define el encabezado de
-- test-seed-current-month.sql):
--
--   admin.sede.test@medigest.test        ADMIN de sede (NO super admin), sedes Centro y Norte
--   admin.centro.test@medigest.test      ADMIN de una sola sede (Centro), para probar aislamiento entre sedes
--   doctor.general.seed@medigest.test    DOCTOR, sede Centro (ya existe en el seed principal)
--   secretaria.centro.seed@medigest.test SECRETARY, sede Centro (ya existe en el seed principal)
--   admin.seed@medigest.test             SUPER ADMIN: entra al panel de plataforma, no a una sede
--
-- Es idempotente: se puede ejecutar varias veces.
-- ============================================================================

BEGIN;

DELETE FROM "DoctorProfile" WHERE id LIKE 'seed_env_%';
DELETE FROM "Profession" WHERE id LIKE 'seed_env_%';
DELETE FROM "ClinicMembership" WHERE id LIKE 'seed_env_%';
DELETE FROM "UserProfile" WHERE id LIKE 'seed_env_%';
DELETE FROM "User" WHERE id LIKE 'seed_env_%';

INSERT INTO "User" (
  id, email, name, "passwordHash", "mustChangePassword", role, status,
  "isSuperAdmin", permissions, "createdAt", "updatedAt", "lastLoginAt"
) VALUES (
  'seed_env_admin_sede',
  'admin.sede.test@medigest.test',
  'Sofia Administradora de Sede',
  '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq',
  false,
  'ADMIN',
  'ACTIVE',
  false,
  ARRAY['AGENDA','CLINICAL_VISITS','PATIENTS','TREATMENTS','LEADS','USERS','BOXES','SEGUIMIENTO','CHAT','CHAT_META']::text[],
  NOW() - INTERVAL '30 days',
  NOW(),
  NULL
),
(
  'seed_env_admin_centro',
  'admin.centro.test@medigest.test',
  'Camilo Administrador Centro',
  '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq',
  false,
  'ADMIN',
  'ACTIVE',
  false,
  ARRAY['AGENDA','CLINICAL_VISITS','PATIENTS','TREATMENTS','LEADS','USERS','BOXES','SEGUIMIENTO','CHAT','CHAT_META']::text[],
  NOW() - INTERVAL '30 days',
  NOW(),
  NULL
);

INSERT INTO "UserProfile" (id, "userId", "firstName", "lastName", phone, rut, "createdAt", "updatedAt") VALUES
  ('seed_env_prof_admin_sede', 'seed_env_admin_sede', 'Sofia', 'Administradora', '+56960100099', 'SEEDENV-ADM-01', NOW(), NOW()),
  ('seed_env_prof_admin_centro', 'seed_env_admin_centro', 'Camilo', 'Administrador', '+56960100098', 'SEEDENV-ADM-02', NOW(), NOW());

INSERT INTO "ClinicMembership" (id, "userId", "clinicId", status, "createdAt", "updatedAt") VALUES
  ('seed_env_mem_admin_sede_centro', 'seed_env_admin_sede', 'seed_cm_clinic_centro', 'ACTIVE', NOW(), NOW()),
  ('seed_env_mem_admin_sede_norte', 'seed_env_admin_sede', 'seed_cm_clinic_norte', 'ACTIVE', NOW(), NOW()),
  ('seed_env_mem_admin_centro_centro', 'seed_env_admin_centro', 'seed_cm_clinic_centro', 'ACTIVE', NOW(), NOW());

-- Profesionales de ejemplo de distintas profesiones (cuentas seed_env_*, clave de docs/CUENTAS-DE-PRUEBA.md).
INSERT INTO "Profession" (id, "clinicId", name, slug, "updatedAt") VALUES
  ('seed_env_prof_otra_masoterapeuta', 'seed_cm_clinic_centro', 'Masoterapeuta', 'masoterapeuta', NOW());

INSERT INTO "User" (
  id, email, name, "passwordHash", "mustChangePassword", role, status,
  "isSuperAdmin", permissions, "createdAt", "updatedAt"
) VALUES
  ('seed_env_psicologa', 'psicologa.test@medigest.test', 'Valentina Psicologa', '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq', false, 'DOCTOR', 'ACTIVE', false, ARRAY[]::text[], NOW() - INTERVAL '30 days', NOW()),
  ('seed_env_kine', 'kine.test@medigest.test', 'Matias Kinesiologo', '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq', false, 'DOCTOR', 'ACTIVE', false, ARRAY[]::text[], NOW() - INTERVAL '30 days', NOW()),
  ('seed_env_maso', 'maso.test@medigest.test', 'Isidora Masoterapeuta', '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq', false, 'DOCTOR', 'ACTIVE', false, ARRAY[]::text[], NOW() - INTERVAL '30 days', NOW());

INSERT INTO "UserProfile" (id, "userId", "firstName", "lastName", phone, rut, "createdAt", "updatedAt") VALUES
  ('seed_env_prof_psicologa', 'seed_env_psicologa', 'Valentina', 'Psicologa', '+56960100091', 'SEEDENV-PRO-01', NOW(), NOW()),
  ('seed_env_prof_kine', 'seed_env_kine', 'Matias', 'Kinesiologo', '+56960100092', 'SEEDENV-PRO-02', NOW(), NOW()),
  ('seed_env_prof_maso', 'seed_env_maso', 'Isidora', 'Masoterapeuta', '+56960100093', 'SEEDENV-PRO-03', NOW(), NOW());

INSERT INTO "DoctorProfile" (id, "userId", rut, "rutNormalized", specialty, "professionId", "isActive", "createdAt", "updatedAt") VALUES
  ('seed_env_dprof_psicologa', 'seed_env_psicologa', 'SEEDENV-PRO-01', 'SEEDENVPRO01', 'Psicologia clinica adultos', 'prof_psicologo', true, NOW(), NOW()),
  ('seed_env_dprof_kine', 'seed_env_kine', 'SEEDENV-PRO-02', 'SEEDENVPRO02', 'Rehabilitacion deportiva', 'prof_kinesiologo', true, NOW(), NOW()),
  ('seed_env_dprof_maso', 'seed_env_maso', 'SEEDENV-PRO-03', 'SEEDENVPRO03', NULL, 'seed_env_prof_otra_masoterapeuta', true, NOW(), NOW());

INSERT INTO "ClinicMembership" (id, "userId", "clinicId", status, "createdAt", "updatedAt") VALUES
  ('seed_env_mem_psicologa_centro', 'seed_env_psicologa', 'seed_cm_clinic_centro', 'ACTIVE', NOW(), NOW()),
  ('seed_env_mem_kine_centro', 'seed_env_kine', 'seed_cm_clinic_centro', 'ACTIVE', NOW(), NOW()),
  ('seed_env_mem_maso_centro', 'seed_env_maso', 'seed_cm_clinic_centro', 'ACTIVE', NOW(), NOW());

-- Los doctores dentales de la siembra base quedan con la profesion Odontologo/a.
UPDATE "DoctorProfile" SET "professionId" = 'prof_dentista'
WHERE "professionId" IS NULL AND id NOT LIKE 'seed_env_%';

COMMIT;
