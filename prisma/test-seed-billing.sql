-- Datos de prueba del panel de facturacion del super admin (/super-admin/facturacion).
-- Requiere haber cargado test-seed-current-month.sql (usa sus tres sedes). Se puede repetir.
-- Fechas relativas al mes en curso, para que las cifras esperadas no cambien con el tiempo:
--   M0 = mes actual, M-1 = mes anterior, etc.
--
-- Cifras esperadas (ver docs/PANEL-FACTURACION-SUPERADMIN.md):
--   MRR 260.000, ARR 3.120.000, 4 sedes que pagan, ARPA 65.000, pago atrasado 1 (40.000),
--   churn M-1 = 1/4 = 25%, churn M0 = 0%, costos M0 = 45.000, margen M0 = 215.000 (82,7%),
--   1 trial (vence en 5 dias), 1 cancelada.

-- Sedes nuevas (solo para el panel comercial, sin usuarios ni pacientes).
INSERT INTO "Clinic" (id, name, city, "isActive", "createdAt", "updatedAt") VALUES
  ('seed_billing_clinic_a', 'Billing Sur', 'Temuco', true, NOW() - INTERVAL '70 days', NOW()),
  ('seed_billing_clinic_b', 'Billing Oriente', 'Santiago', true, NOW() - INTERVAL '20 days', NOW()),
  ('seed_billing_clinic_c', 'Billing Trial', 'Valdivia', true, NOW() - INTERVAL '9 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Datos comerciales de cada sede.
UPDATE "Clinic" SET "billingStatus" = 'ACTIVE', "planName" = 'Pro', "monthlyPrice" = 90000,
  "subscriptionStartedAt" = date_trunc('month', NOW()) - INTERVAL '5 months' + INTERVAL '4 days',
  "canceledAt" = NULL, "trialEndsAt" = NULL
  WHERE id = 'seed_cm_clinic_centro';

UPDATE "Clinic" SET "billingStatus" = 'PAST_DUE', "planName" = 'Starter', "monthlyPrice" = 40000,
  "subscriptionStartedAt" = date_trunc('month', NOW()) - INTERVAL '3 months' + INTERVAL '4 days',
  "canceledAt" = NULL, "trialEndsAt" = NULL
  WHERE id = 'seed_cm_clinic_norte';

UPDATE "Clinic" SET "billingStatus" = 'CANCELED', "planName" = 'Pro', "monthlyPrice" = 90000,
  "subscriptionStartedAt" = date_trunc('month', NOW()) - INTERVAL '4 months' + INTERVAL '4 days',
  "canceledAt" = date_trunc('month', NOW()) - INTERVAL '1 month' + INTERVAL '9 days',
  "trialEndsAt" = NULL
  WHERE id = 'seed_cm_clinic_laboratorio';

UPDATE "Clinic" SET "billingStatus" = 'ACTIVE', "planName" = 'Starter', "monthlyPrice" = 40000,
  "subscriptionStartedAt" = date_trunc('month', NOW()) - INTERVAL '2 months' + INTERVAL '4 days',
  "canceledAt" = NULL, "trialEndsAt" = NULL
  WHERE id = 'seed_billing_clinic_a';

UPDATE "Clinic" SET "billingStatus" = 'ACTIVE', "planName" = 'Pro', "monthlyPrice" = 90000,
  "subscriptionStartedAt" = date_trunc('month', NOW()),
  "canceledAt" = NULL, "trialEndsAt" = NULL
  WHERE id = 'seed_billing_clinic_b';

UPDATE "Clinic" SET "billingStatus" = 'TRIAL', "planName" = NULL, "monthlyPrice" = NULL,
  "subscriptionStartedAt" = NULL, "canceledAt" = NULL, "trialEndsAt" = NOW() + INTERVAL '5 days'
  WHERE id = 'seed_billing_clinic_c';

-- Costos de plataforma: Infraestructura 25.000 e IA 15.000 cada mes; Correo 5.000 solo el mes actual.
DELETE FROM "PlatformCost" WHERE id LIKE 'seed\_billing\_cost\_%';

INSERT INTO "PlatformCost" (id, month, category, description, amount)
SELECT 'seed_billing_cost_infra_' || to_char(m, 'YYYYMM'), to_char(m, 'YYYY-MM'), 'Infraestructura', 'Hosting y base de datos', 25000
FROM generate_series(date_trunc('month', NOW()) - INTERVAL '5 months', date_trunc('month', NOW()), INTERVAL '1 month') AS m;

INSERT INTO "PlatformCost" (id, month, category, description, amount)
SELECT 'seed_billing_cost_ia_' || to_char(m, 'YYYYMM'), to_char(m, 'YYYY-MM'), 'IA', 'Modelos de lenguaje', 15000
FROM generate_series(date_trunc('month', NOW()) - INTERVAL '5 months', date_trunc('month', NOW()), INTERVAL '1 month') AS m;

INSERT INTO "PlatformCost" (id, month, category, description, amount) VALUES
  ('seed_billing_cost_mail_' || to_char(NOW(), 'YYYYMM'), to_char(NOW(), 'YYYY-MM'), 'Correo', 'Envio de correos', 5000);
