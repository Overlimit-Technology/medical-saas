-- Datos de prueba del dashboard comercial del super admin (/super-admin).
-- Requiere haber cargado test-seed-current-month.sql y test-seed-billing.sql. Se puede repetir:
-- solo borra y recrea filas con id seed_dash_*. Todas las fechas son relativas a hoy.
--
-- Agrega 14 sedes con distintos planes, ciudades y estados (activas, morosa, canceladas, suspendida, en prueba),
-- altas y bajas repartidas en 12 meses, pacientes, citas, usuarios y costos de plataforma para los meses viejos.
-- Los usuarios usan la misma clave que el resto de las cuentas de prueba (ver encabezado de test-seed-current-month.sql).

BEGIN;

DELETE FROM "Appointment" WHERE id LIKE 'seed_dash_%';
DELETE FROM "Patient" WHERE id LIKE 'seed_dash_%';
DELETE FROM "Box" WHERE id LIKE 'seed_dash_%';
DELETE FROM "ClinicMembership" WHERE id LIKE 'seed_dash_%';
DELETE FROM "UserProfile" WHERE id LIKE 'seed_dash_%';
DELETE FROM "User" WHERE id LIKE 'seed_dash_%';
DELETE FROM "PlatformCost" WHERE id LIKE 'seed_dash_%';
DELETE FROM "Clinic" WHERE id LIKE 'seed_dash_%';

-- n, nombre, ciudad, activa, estado comercial, plan, precio, dias hasta fin de prueba (nulo si no aplica),
-- meses desde el alta (nulo si nunca pago), meses desde la cancelacion (nulo si no cancelo), meses desde que se creo,
-- pacientes totales, citas base por mes, primer mes con actividad (meses atras), ultimo mes con actividad (0 = este mes)
CREATE TEMP TABLE _dash_cfg ON COMMIT DROP AS
SELECT * FROM (VALUES
  (1,  'Dental Providencia',        'Santiago',      true,  'ACTIVE',   'Pro',      90000,  NULL::int, 11,   NULL::int, 12, 120, 30, 11, 0),
  (2,  'Kine Las Condes',           'Santiago',      true,  'ACTIVE',   'Premium', 150000,  NULL,       9,   NULL,      10, 200, 45,  9, 0),
  (3,  'Centro Medico Concepcion',  'Concepcion',    true,  'ACTIVE',   'Pro',      90000,  NULL,       8,   NULL,       9,  90, 22,  8, 0),
  (4,  'Odonto Valparaiso',         'Valparaiso',    true,  'ACTIVE',   'Starter',  40000,  NULL,       7,   NULL,       8,  70, 18,  7, 0),
  (5,  'Kine Temuco Sur',           'Temuco',        true,  'PAST_DUE', 'Starter',  40000,  NULL,       6,   NULL,       7,  40,  8,  6, 0),
  (6,  'Estetica Vina',             'Vina del Mar',  true,  'ACTIVE',   'Pro',      90000,  NULL,       5,   NULL,       6,  55, 14,  5, 0),
  (7,  'Pediatria Antofagasta',     'Antofagasta',   false, 'CANCELED', 'Starter',  40000,  NULL,      10,   6,         11,  20,  6, 10, 6),
  (8,  'Clinica La Serena',         'La Serena',     false, 'CANCELED', 'Pro',      90000,  NULL,       8,   3,          9,  35, 10,  8, 3),
  (9,  'Podologia Rancagua',        'Rancagua',      true,  'ACTIVE',   'Starter',  40000,  NULL,       4,   NULL,       5,  25,  9,  4, 0),
  (10, 'Dermato Puerto Montt',      'Puerto Montt',  false, 'ACTIVE',   'Premium', 150000,  NULL,       3,   NULL,       4,  15,  6,  3, 0),
  (11, 'Prueba Iquique',            'Iquique',       true,  'TRIAL',    'Pro',      90000,  2,          NULL, NULL,       0,   6,  3,  0, 0),
  (12, 'Prueba Talca',              'Talca',         true,  'TRIAL',    'Starter',  40000,  12,         NULL, NULL,       0,   4,  2,  0, 0),
  (13, 'Prueba Vencida Arica',      'Arica',         true,  'TRIAL',    NULL,       NULL,   -3,         NULL, NULL,       1,   8,  4,  0, 0),
  (14, 'Optica Osorno',             'Osorno',        true,  'ACTIVE',   'Starter',  40000,  NULL,       1,   NULL,       2,  12,  5,  1, 0)
) AS t(n, name, city, active, status, plan, price, trial_days, sub_ago, cancel_ago, created_ago, patients, appts, first_m, last_m);

INSERT INTO "Clinic" (
  id, name, city, "isActive", "billingStatus", "planName", "monthlyPrice",
  "trialEndsAt", "subscriptionStartedAt", "canceledAt", "createdAt", "updatedAt"
)
SELECT
  'seed_dash_clinic_' || lpad(n::text, 2, '0'),
  name, city, active, status::"ClinicBillingStatus", plan, price,
  CASE WHEN trial_days IS NULL THEN NULL ELSE NOW() + make_interval(days => trial_days) END,
  CASE WHEN sub_ago IS NULL THEN NULL ELSE date_trunc('month', NOW()) - make_interval(months => sub_ago) + INTERVAL '4 days' END,
  CASE WHEN cancel_ago IS NULL THEN NULL ELSE date_trunc('month', NOW()) - make_interval(months => cancel_ago) + INTERVAL '9 days' END,
  NOW() - make_interval(months => created_ago, days => 2),
  NOW()
FROM _dash_cfg;

INSERT INTO "Box" (id, "clinicId", name, "isActive", "createdAt", "updatedAt")
SELECT 'seed_dash_box_' || lpad(n::text, 2, '0'), 'seed_dash_clinic_' || lpad(n::text, 2, '0'), 'Box 1', true, NOW(), NOW()
FROM _dash_cfg;

-- Usuarios: un ADMIN por sede y un doctor en las sedes con mas actividad.
INSERT INTO "User" (
  id, email, name, "passwordHash", "mustChangePassword", role, status,
  "isSuperAdmin", permissions, "createdAt", "updatedAt", "lastLoginAt"
)
SELECT
  'seed_dash_usr_' || lpad(n::text, 2, '0') || '_a',
  'dash.' || lpad(n::text, 2, '0') || '.admin@medigest.test',
  'Admin ' || name,
  '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq',
  false, 'ADMIN', 'ACTIVE', false,
  ARRAY['AGENDA','PATIENTS']::text[],
  NOW() - make_interval(months => created_ago),
  NOW(),
  -- Las sedes canceladas dejaron de entrar hace tiempo; el resto entro en los ultimos dias.
  CASE WHEN active AND status <> 'CANCELED' THEN NOW() - make_interval(days => n) ELSE NOW() - INTERVAL '90 days' END
FROM _dash_cfg;

INSERT INTO "User" (
  id, email, name, "passwordHash", "mustChangePassword", role, status,
  "isSuperAdmin", permissions, "createdAt", "updatedAt", "lastLoginAt"
)
SELECT
  'seed_dash_usr_' || lpad(n::text, 2, '0') || '_d',
  'dash.' || lpad(n::text, 2, '0') || '.doctor@medigest.test',
  'Doctor ' || name,
  '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq',
  false, 'DOCTOR', 'ACTIVE', false,
  ARRAY['AGENDA','CLINICAL_VISITS']::text[],
  NOW() - make_interval(months => created_ago),
  NOW(),
  -- Algunos doctores no entran hace mas de 30 dias para que "usuarios activos 30 d" se diferencie del total.
  CASE WHEN n % 3 = 0 THEN NOW() - INTERVAL '45 days' ELSE NOW() - make_interval(days => n + 1) END
FROM _dash_cfg
WHERE appts >= 8;

INSERT INTO "UserProfile" (id, "userId", "firstName", "lastName", phone, rut, "createdAt", "updatedAt")
SELECT 'seed_dash_prof_' || substr(id, 15), id, split_part(name, ' ', 1), 'Demo', NULL, 'SEEDDASH-' || substr(id, 15), NOW(), NOW()
FROM "User" WHERE id LIKE 'seed_dash_usr_%';

INSERT INTO "ClinicMembership" (id, "userId", "clinicId", status, "createdAt", "updatedAt")
SELECT 'seed_dash_mem_' || substr(id, 15), id, 'seed_dash_clinic_' || substring(id from 15 for 2), 'ACTIVE', NOW(), NOW()
FROM "User" WHERE id LIKE 'seed_dash_usr_%';

-- Pacientes repartidos desde la creacion de la sede hasta hoy.
INSERT INTO "Patient" (id, "clinicId", "firstName", "lastName", run, "runNormalized", "isActive", "createdAt", "updatedAt")
SELECT
  'seed_dash_pat_' || lpad(c.n::text, 2, '0') || '_' || g,
  'seed_dash_clinic_' || lpad(c.n::text, 2, '0'),
  'Paciente' || g, 'Demo' || c.n,
  '9' || lpad(c.n::text, 2, '0') || lpad(g::text, 4, '0') || '-K',
  '9' || lpad(c.n::text, 2, '0') || lpad(g::text, 4, '0') || 'K',
  true,
  (NOW() - make_interval(months => c.created_ago)) + (NOW() - (NOW() - make_interval(months => c.created_ago))) * (g::float8 / c.patients),
  NOW()
FROM _dash_cfg c, LATERAL generate_series(1, c.patients) AS g;

-- Citas: crecen mes a mes mientras la sede esta activa. El doctor es uno de los usuarios del seed principal.
INSERT INTO "Appointment" (
  id, "clinicId", "patientId", "doctorId", "boxId", "startAt", "endAt", status, "paymentStatus", "createdAt", "updatedAt"
)
SELECT
  'seed_dash_apt_' || lpad(c.n::text, 2, '0') || '_' || m || '_' || k,
  'seed_dash_clinic_' || lpad(c.n::text, 2, '0'),
  'seed_dash_pat_' || lpad(c.n::text, 2, '0') || '_' || (1 + (k + m * 7) % c.patients),
  'seed_cm_usr_doc_general',
  'seed_dash_box_' || lpad(c.n::text, 2, '0'),
  date_trunc('month', NOW()) - make_interval(months => m) + make_interval(days => (k % 27), hours => 8 + (k % 9)),
  date_trunc('month', NOW()) - make_interval(months => m) + make_interval(days => (k % 27), hours => 9 + (k % 9)),
  (CASE WHEN m = 0 THEN 'SCHEDULED' WHEN k % 10 = 0 THEN 'CANCELLED' WHEN k % 10 = 1 THEN 'NO_SHOW' ELSE 'COMPLETED' END)::"AppointmentStatus",
  'PENDING'::"PaymentStatus",
  NOW(), NOW()
FROM _dash_cfg c,
  LATERAL generate_series(c.last_m, c.first_m) AS m,
  LATERAL generate_series(1, GREATEST(1, round(c.appts * (0.4 + 0.6 * (c.first_m - m + 1)::numeric / (c.first_m + 1)))::int)) AS k;

-- Costos de plataforma de los meses viejos (el seed de facturacion cubre los ultimos 6 meses).
INSERT INTO "PlatformCost" (id, month, category, description, amount)
SELECT 'seed_dash_cost_infra_' || to_char(m, 'YYYYMM'), to_char(m, 'YYYY-MM'), 'Infraestructura', 'Hosting y base de datos', 18000 + 1000 * extract(month FROM m)::int
FROM generate_series(date_trunc('month', NOW()) - INTERVAL '11 months', date_trunc('month', NOW()) - INTERVAL '6 months', INTERVAL '1 month') AS m;

INSERT INTO "PlatformCost" (id, month, category, description, amount)
SELECT 'seed_dash_cost_ia_' || to_char(m, 'YYYYMM'), to_char(m, 'YYYY-MM'), 'IA', 'Modelos de lenguaje', 6000 + 500 * extract(month FROM m)::int
FROM generate_series(date_trunc('month', NOW()) - INTERVAL '11 months', date_trunc('month', NOW()) - INTERVAL '6 months', INTERVAL '1 month') AS m;

COMMIT;
