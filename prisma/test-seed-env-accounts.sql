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

COMMIT;
