-- ============================================================================
-- MEDIGEST / ZENSYA - SQL Seed completo para testing
-- Inyectar directo en PostgreSQL para poblar TODAS las tablas
-- Password para todos los usuarios de test: Test1234!
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. LIMPIAR DATOS PREVIOS (orden inverso por FK)
-- ============================================================================
DELETE FROM "PaymentHistory";
DELETE FROM "PatientTreatment";
DELETE FROM "Treatment";
DELETE FROM "InternalAlertRecipient";
DELETE FROM "InternalAlert";
DELETE FROM "Observation";
DELETE FROM "ClinicalVisit";
DELETE FROM "FhirLink";
DELETE FROM "Appointment";
DELETE FROM "Box";
DELETE FROM "Patient";
DELETE FROM "DoctorProfile";
DELETE FROM "ClinicMembership";
DELETE FROM "Session";
DELETE FROM "Account";
DELETE FROM "VerificationToken";
DELETE FROM "AuditLog";
DELETE FROM "UserProfile";
DELETE FROM "User";
DELETE FROM "Clinic";

-- ============================================================================
-- 1. CLINICAS
-- ============================================================================
INSERT INTO "Clinic" (id, name, city, "isActive", "createdAt", "updatedAt") VALUES
  ('clinic_santiago',   'Clínica Santiago Centro',   'Santiago',    true, NOW(), NOW()),
  ('clinic_vina',       'Clínica Viña del Mar',      'Viña del Mar', true, NOW(), NOW()),
  ('clinic_inactive',   'Clínica Cerrada (Test)',    'Temuco',      false, NOW(), NOW());

-- ============================================================================
-- 2. USUARIOS (password hash = Test1234!)
-- ============================================================================
-- Hash bcrypt para "Test1234!"
-- $2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq

INSERT INTO "User" (id, email, name, "passwordHash", "mustChangePassword", role, status, "createdAt", "updatedAt", "lastLoginAt") VALUES
  -- ADMINS
  ('usr_admin1',     'admin.test@medigest.cl',      'Carlos Admin',       '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq', false, 'ADMIN',     'ACTIVE',    NOW() - INTERVAL '90 days', NOW(), NOW() - INTERVAL '1 day'),
  ('usr_admin2',     'admin2.test@medigest.cl',     'Laura Admin',        '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq', false, 'ADMIN',     'ACTIVE',    NOW() - INTERVAL '60 days', NOW(), NOW() - INTERVAL '3 days'),
  -- DOCTORES
  ('usr_doc1',       'doctor1.test@medigest.cl',    'Dr. Andrés Muñoz',   '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq', false, 'DOCTOR',    'ACTIVE',    NOW() - INTERVAL '80 days', NOW(), NOW() - INTERVAL '1 hour'),
  ('usr_doc2',       'doctor2.test@medigest.cl',    'Dra. Valentina Soto','$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq', false, 'DOCTOR',    'ACTIVE',    NOW() - INTERVAL '70 days', NOW(), NOW() - INTERVAL '2 hours'),
  ('usr_doc3',       'doctor3.test@medigest.cl',    'Dr. Felipe Reyes',   '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq', false, 'DOCTOR',    'ACTIVE',    NOW() - INTERVAL '50 days', NOW(), NULL),
  ('usr_doc_multi',  'doctor.multi@medigest.cl',    'Dra. Camila Lagos',  '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq', false, 'DOCTOR',    'ACTIVE',    NOW() - INTERVAL '40 days', NOW(), NOW()),
  -- SECRETARIAS
  ('usr_sec1',       'secretaria1.test@medigest.cl','Sofía Secretaria',   '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq', false, 'SECRETARY', 'ACTIVE',    NOW() - INTERVAL '85 days', NOW(), NOW() - INTERVAL '5 hours'),
  ('usr_sec2',       'secretaria2.test@medigest.cl','María Secretaria',   '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq', false, 'SECRETARY', 'ACTIVE',    NOW() - INTERVAL '30 days', NOW(), NOW() - INTERVAL '1 day'),
  -- CASOS EDGE
  ('usr_suspended',  'suspended@medigest.cl',       'Usuario Suspendido', '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq', false, 'DOCTOR',    'SUSPENDED', NOW() - INTERVAL '100 days', NOW(), NOW() - INTERVAL '30 days'),
  ('usr_pending',    'pending@medigest.cl',          'Usuario Pendiente',  '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq', true,  'SECRETARY', 'PENDING',   NOW() - INTERVAL '2 days',   NOW(), NULL),
  ('usr_mustchange', 'mustchange@medigest.cl',       'Cambiar Password',  '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq', true,  'DOCTOR',    'ACTIVE',    NOW() - INTERVAL '1 day',   NOW(), NULL);

-- ============================================================================
-- 3. PERFILES DE USUARIO
-- ============================================================================
INSERT INTO "UserProfile" (id, "userId", "firstName", "lastName", phone, rut, "createdAt", "updatedAt") VALUES
  ('prof_admin1',    'usr_admin1',     'Carlos',    'Administrador', '+56911111111', '12345678-9',  NOW(), NOW()),
  ('prof_admin2',    'usr_admin2',     'Laura',     'Gerente',       '+56911111112', '12345678-0',  NOW(), NOW()),
  ('prof_doc1',      'usr_doc1',       'Andrés',    'Muñoz',         '+56922222222', '11111111-1',  NOW(), NOW()),
  ('prof_doc2',      'usr_doc2',       'Valentina', 'Soto',          '+56922222223', '22222222-2',  NOW(), NOW()),
  ('prof_doc3',      'usr_doc3',       'Felipe',    'Reyes',         '+56922222224', '33333333-3',  NOW(), NOW()),
  ('prof_doc_multi', 'usr_doc_multi',  'Camila',    'Lagos',         '+56922222225', '44444444-4',  NOW(), NOW()),
  ('prof_sec1',      'usr_sec1',       'Sofía',     'Rojas',         '+56933333333', '55555555-5',  NOW(), NOW()),
  ('prof_sec2',      'usr_sec2',       'María',     'González',      '+56933333334', '66666666-6',  NOW(), NOW()),
  ('prof_suspended', 'usr_suspended',  'Pedro',     'Suspendido',    '+56900000001', '77777777-7',  NOW(), NOW()),
  ('prof_pending',   'usr_pending',    'Ana',       'Pendiente',     '+56900000002', '88888888-8',  NOW(), NOW()),
  ('prof_mustchange','usr_mustchange', 'Juan',      'CambiarPass',   '+56900000003', '99999999-9',  NOW(), NOW());

-- ============================================================================
-- 4. PERFILES DE DOCTOR
-- ============================================================================
INSERT INTO "DoctorProfile" (id, "userId", rut, "rutNormalized", specialty, bio, "isActive", "createdAt", "updatedAt") VALUES
  ('dprof_doc1',      'usr_doc1',       '11.111.111-1', '111111111', 'Odontología General',    'Especialista con 10 años de experiencia', true,  NOW(), NOW()),
  ('dprof_doc2',      'usr_doc2',       '22.222.222-2', '222222222', 'Ortodoncia',             'Máster en ortodoncia invisible',          true,  NOW(), NOW()),
  ('dprof_doc3',      'usr_doc3',       '33.333.333-3', '333333333', 'Endodoncia',             'Especialista en tratamientos de conducto', true,  NOW(), NOW()),
  ('dprof_doc_multi', 'usr_doc_multi',  '44.444.444-4', '444444444', 'Periodoncia',            'Cirujana periodontal',                    true,  NOW(), NOW()),
  ('dprof_suspended', 'usr_suspended',  '77.777.777-7', '777777777', 'Cirugía Maxilofacial',   NULL,                                      false, NOW(), NOW()),
  ('dprof_mustchange','usr_mustchange', '99.999.999-9', '999999999', 'Implantología',          NULL,                                      true,  NOW(), NOW());

-- ============================================================================
-- 5. MEMBRESÍAS CLÍNICA-USUARIO
-- ============================================================================
INSERT INTO "ClinicMembership" (id, "userId", "clinicId", status, "createdAt", "updatedAt") VALUES
  -- Clínica Santiago
  ('mem_adm1_stgo',   'usr_admin1',    'clinic_santiago', 'ACTIVE',   NOW(), NOW()),
  ('mem_doc1_stgo',   'usr_doc1',      'clinic_santiago', 'ACTIVE',   NOW(), NOW()),
  ('mem_doc2_stgo',   'usr_doc2',      'clinic_santiago', 'ACTIVE',   NOW(), NOW()),
  ('mem_sec1_stgo',   'usr_sec1',      'clinic_santiago', 'ACTIVE',   NOW(), NOW()),
  ('mem_multi_stgo',  'usr_doc_multi', 'clinic_santiago', 'ACTIVE',   NOW(), NOW()),
  ('mem_susp_stgo',   'usr_suspended', 'clinic_santiago', 'INACTIVE', NOW(), NOW()),
  -- Clínica Viña
  ('mem_adm2_vina',   'usr_admin2',    'clinic_vina',     'ACTIVE',   NOW(), NOW()),
  ('mem_doc3_vina',   'usr_doc3',      'clinic_vina',     'ACTIVE',   NOW(), NOW()),
  ('mem_sec2_vina',   'usr_sec2',      'clinic_vina',     'ACTIVE',   NOW(), NOW()),
  ('mem_multi_vina',  'usr_doc_multi', 'clinic_vina',     'ACTIVE',   NOW(), NOW()),
  -- Membresía en clínica inactiva
  ('mem_doc1_inact',  'usr_doc1',      'clinic_inactive', 'INACTIVE', NOW(), NOW());

-- ============================================================================
-- 6. BOXES (salas de atención)
-- ============================================================================
INSERT INTO "Box" (id, "clinicId", name, "isActive", "createdAt", "updatedAt") VALUES
  -- Santiago
  ('box_stgo_1', 'clinic_santiago', 'Box 1',           true,  NOW(), NOW()),
  ('box_stgo_2', 'clinic_santiago', 'Box 2',           true,  NOW(), NOW()),
  ('box_stgo_3', 'clinic_santiago', 'Box 3',           true,  NOW(), NOW()),
  ('box_stgo_x', 'clinic_santiago', 'Box Radiología',  true,  NOW(), NOW()),
  ('box_stgo_d', 'clinic_santiago', 'Box Deshabilitado', false, NOW(), NOW()),
  -- Viña
  ('box_vina_1', 'clinic_vina',     'Sala A',          true,  NOW(), NOW()),
  ('box_vina_2', 'clinic_vina',     'Sala B',          true,  NOW(), NOW());

-- ============================================================================
-- 7. PACIENTES
-- ============================================================================
INSERT INTO "Patient" (id, "clinicId", "firstName", "lastName", "secondLastName", run, "runNormalized", email, phone, "birthDate", gender, address, city, "emergencyContactName", "emergencyContactPhone", "isActive", "createdAt", "updatedAt") VALUES
  -- Santiago (8 pacientes)
  ('pat_stgo_01', 'clinic_santiago', 'Juan',      'Pérez',     'López',     '10.100.100-1', '101001001', 'juan.perez@test.cl',    '+56941111111', '1985-03-15', 'male',   'Av. Providencia 1234',  'Santiago',    'María Pérez',      '+56941111112', true,  NOW() - INTERVAL '60 days', NOW()),
  ('pat_stgo_02', 'clinic_santiago', 'Ana',       'García',    'Martínez',  '10.200.200-2', '102002002', 'ana.garcia@test.cl',    '+56942222222', '1990-07-22', 'female', 'Los Leones 567',       'Santiago',    'Pedro García',     '+56942222223', true,  NOW() - INTERVAL '55 days', NOW()),
  ('pat_stgo_03', 'clinic_santiago', 'Roberto',   'Sánchez',   NULL,        '10.300.300-3', '103003003', 'roberto.s@test.cl',     '+56943333333', '1978-11-10', 'male',   'Manuel Montt 890',     'Providencia', 'Laura Sánchez',    '+56943333334', true,  NOW() - INTERVAL '45 days', NOW()),
  ('pat_stgo_04', 'clinic_santiago', 'Catalina',  'Muñoz',     'Díaz',      '10.400.400-4', '104004004', 'cata.munoz@test.cl',    '+56944444444', '2000-01-05', 'female', 'Irarrázaval 1111',     'Ñuñoa',       NULL,               NULL,           true,  NOW() - INTERVAL '30 days', NOW()),
  ('pat_stgo_05', 'clinic_santiago', 'Diego',     'Torres',    'Ruiz',      '10.500.500-5', '105005005', NULL,                    '+56945555555', '1995-05-20', 'male',   NULL,                   NULL,          NULL,               NULL,           true,  NOW() - INTERVAL '20 days', NOW()),
  ('pat_stgo_06', 'clinic_santiago', 'Francisca', 'Hernández', NULL,        '10.600.600-6', '106006006', 'fran.h@test.cl',        NULL,           '1988-09-30', 'female', 'Apoquindo 3456',       'Las Condes',  'Jorge Hernández',  '+56946666667', true,  NOW() - INTERVAL '10 days', NOW()),
  ('pat_stgo_07', 'clinic_santiago', 'Matías',    'López',     'Vera',      '10.700.700-7', '107007007', 'matias.lopez@test.cl',  '+56947777777', NULL,         'male',   NULL,                   'Santiago',    NULL,               NULL,           true,  NOW() - INTERVAL '5 days',  NOW()),
  ('pat_stgo_08', 'clinic_santiago', 'Isidora',   'Inactiva',  NULL,        '10.800.800-8', '108008008', 'isidora@test.cl',       '+56948888888', '1992-12-25', 'female', 'Calle Antigua 999',    'Santiago',    NULL,               NULL,           false, NOW() - INTERVAL '120 days', NOW()),  -- paciente inactivo
  -- Viña (4 pacientes)
  ('pat_vina_01', 'clinic_vina',     'Tomás',     'Morales',   'Silva',     '20.100.100-1', '201001001', 'tomas.m@test.cl',       '+56951111111', '1982-04-18', 'male',   'Av. Valparaíso 100',   'Viña del Mar', 'Carmen Morales',  '+56951111112', true,  NOW() - INTERVAL '40 days', NOW()),
  ('pat_vina_02', 'clinic_vina',     'Constanza', 'Rivera',    NULL,        '20.200.200-2', '202002002', 'consta.r@test.cl',      '+56952222222', '1997-08-14', 'female', '1 Norte 234',          'Viña del Mar', NULL,              NULL,           true,  NOW() - INTERVAL '35 days', NOW()),
  ('pat_vina_03', 'clinic_vina',     'Sebastián', 'Vargas',    'Pinto',     '20.300.300-3', '203003003', NULL,                    '+56953333333', '1975-02-28', 'male',   NULL,                   'Viña del Mar', 'Paula Vargas',    '+56953333334', true,  NOW() - INTERVAL '25 days', NOW()),
  ('pat_vina_04', 'clinic_vina',     'Javiera',   'Fuentes',   NULL,        '20.400.400-K', '204004000K','javiera.f@test.cl',     '+56954444444', '2003-06-10', 'female', 'Av. Libertad 567',     'Viña del Mar', NULL,              NULL,           true,  NOW() - INTERVAL '15 days', NOW());

-- ============================================================================
-- 8. CITAS / APPOINTMENTS (variedad de estados y fechas)
-- ============================================================================
INSERT INTO "Appointment" (id, "clinicId", "patientId", "doctorId", "boxId", "startAt", "endAt", status, "paymentStatus", notes, "createdBy", "createdAt", "updatedAt") VALUES
  -- === SANTIAGO: Citas pasadas ===
  ('appt_stgo_past01', 'clinic_santiago', 'pat_stgo_01', 'usr_doc1', 'box_stgo_1', NOW() - INTERVAL '30 days' + TIME '09:00', NOW() - INTERVAL '30 days' + TIME '09:30', 'COMPLETED',  'PAID',    'Control rutinario',           'usr_sec1', NOW() - INTERVAL '31 days', NOW()),
  ('appt_stgo_past02', 'clinic_santiago', 'pat_stgo_02', 'usr_doc2', 'box_stgo_2', NOW() - INTERVAL '25 days' + TIME '10:00', NOW() - INTERVAL '25 days' + TIME '11:00', 'COMPLETED',  'PAID',    'Instalación brackets',        'usr_sec1', NOW() - INTERVAL '26 days', NOW()),
  ('appt_stgo_past03', 'clinic_santiago', 'pat_stgo_03', 'usr_doc1', 'box_stgo_1', NOW() - INTERVAL '20 days' + TIME '11:00', NOW() - INTERVAL '20 days' + TIME '11:45', 'COMPLETED',  'PENDING', 'Limpieza dental completa',    'usr_admin1', NOW() - INTERVAL '21 days', NOW()),
  ('appt_stgo_past04', 'clinic_santiago', 'pat_stgo_04', 'usr_doc2', 'box_stgo_3', NOW() - INTERVAL '15 days' + TIME '14:00', NOW() - INTERVAL '15 days' + TIME '14:30', 'NO_SHOW',    'PENDING', 'Paciente no se presentó',     'usr_sec1', NOW() - INTERVAL '16 days', NOW()),
  ('appt_stgo_past05', 'clinic_santiago', 'pat_stgo_01', 'usr_doc1', 'box_stgo_1', NOW() - INTERVAL '10 days' + TIME '09:00', NOW() - INTERVAL '10 days' + TIME '09:30', 'CANCELLED',  'WAIVED',  'Cancelada por paciente',      'usr_sec1', NOW() - INTERVAL '11 days', NOW()),
  ('appt_stgo_past06', 'clinic_santiago', 'pat_stgo_05', 'usr_doc_multi', 'box_stgo_2', NOW() - INTERVAL '7 days' + TIME '15:00', NOW() - INTERVAL '7 days' + TIME '16:00', 'COMPLETED', 'PAID', 'Evaluación periodontal',      'usr_admin1', NOW() - INTERVAL '8 days', NOW()),
  -- === SANTIAGO: Citas de hoy ===
  ('appt_stgo_today01', 'clinic_santiago', 'pat_stgo_02', 'usr_doc1', 'box_stgo_1', NOW()::date + TIME '08:00', NOW()::date + TIME '08:30', 'CONFIRMED', 'PENDING', 'Control post-operatorio',     'usr_sec1', NOW() - INTERVAL '3 days', NOW()),
  ('appt_stgo_today02', 'clinic_santiago', 'pat_stgo_06', 'usr_doc2', 'box_stgo_2', NOW()::date + TIME '09:00', NOW()::date + TIME '10:00', 'SCHEDULED', 'PENDING', 'Primera consulta ortodoncia',  'usr_sec1', NOW() - INTERVAL '5 days', NOW()),
  ('appt_stgo_today03', 'clinic_santiago', 'pat_stgo_03', 'usr_doc_multi', 'box_stgo_3', NOW()::date + TIME '10:30', NOW()::date + TIME '11:30', 'CONFIRMED', 'PENDING', 'Tratamiento periodontal', 'usr_admin1', NOW() - INTERVAL '2 days', NOW()),
  ('appt_stgo_today04', 'clinic_santiago', 'pat_stgo_07', 'usr_doc1', 'box_stgo_1', NOW()::date + TIME '11:00', NOW()::date + TIME '11:30', 'SCHEDULED', 'PENDING', 'Urgencia dental',             'usr_sec1', NOW() - INTERVAL '1 day', NOW()),
  -- === SANTIAGO: Citas futuras ===
  ('appt_stgo_fut01', 'clinic_santiago', 'pat_stgo_01', 'usr_doc1', 'box_stgo_1', NOW() + INTERVAL '1 day' + TIME '09:00', NOW() + INTERVAL '1 day' + TIME '09:30', 'SCHEDULED', 'PENDING', 'Seguimiento tratamiento',      'usr_sec1', NOW(), NOW()),
  ('appt_stgo_fut02', 'clinic_santiago', 'pat_stgo_04', 'usr_doc2', 'box_stgo_2', NOW() + INTERVAL '2 days' + TIME '10:00', NOW() + INTERVAL '2 days' + TIME '11:00', 'SCHEDULED', 'PENDING', 'Re-agendar cita perdida',     'usr_sec1', NOW(), NOW()),
  ('appt_stgo_fut03', 'clinic_santiago', 'pat_stgo_05', 'usr_doc_multi', 'box_stgo_3', NOW() + INTERVAL '3 days' + TIME '14:00', NOW() + INTERVAL '3 days' + TIME '15:00', 'CONFIRMED', 'PENDING', 'Cirugía periodontal', 'usr_admin1', NOW(), NOW()),
  ('appt_stgo_fut04', 'clinic_santiago', 'pat_stgo_06', 'usr_doc1', 'box_stgo_x', NOW() + INTERVAL '5 days' + TIME '08:30', NOW() + INTERVAL '5 days' + TIME '09:00', 'SCHEDULED', 'PENDING', 'Radiografía panorámica',       'usr_sec1', NOW(), NOW()),
  ('appt_stgo_fut05', 'clinic_santiago', 'pat_stgo_02', 'usr_doc2', 'box_stgo_2', NOW() + INTERVAL '7 days' + TIME '11:00', NOW() + INTERVAL '7 days' + TIME '12:00', 'SCHEDULED', 'PENDING', 'Ajuste de brackets',          'usr_sec1', NOW(), NOW()),
  -- === VIÑA: Mix de citas ===
  ('appt_vina_past01', 'clinic_vina', 'pat_vina_01', 'usr_doc3', 'box_vina_1', NOW() - INTERVAL '14 days' + TIME '09:00', NOW() - INTERVAL '14 days' + TIME '09:45', 'COMPLETED', 'PAID',    'Endodoncia molar 36',         'usr_sec2', NOW() - INTERVAL '15 days', NOW()),
  ('appt_vina_past02', 'clinic_vina', 'pat_vina_02', 'usr_doc_multi', 'box_vina_2', NOW() - INTERVAL '7 days' + TIME '10:00', NOW() - INTERVAL '7 days' + TIME '10:30', 'COMPLETED', 'PAID', 'Evaluación periodontal',       'usr_sec2', NOW() - INTERVAL '8 days', NOW()),
  ('appt_vina_today01','clinic_vina', 'pat_vina_03', 'usr_doc3', 'box_vina_1', NOW()::date + TIME '09:00', NOW()::date + TIME '10:00', 'CONFIRMED', 'PENDING', 'Tratamiento de conducto',     'usr_sec2', NOW() - INTERVAL '3 days', NOW()),
  ('appt_vina_fut01',  'clinic_vina', 'pat_vina_04', 'usr_doc3', 'box_vina_2', NOW() + INTERVAL '4 days' + TIME '14:00', NOW() + INTERVAL '4 days' + TIME '15:00', 'SCHEDULED', 'PENDING', 'Primera consulta',            'usr_sec2', NOW(), NOW()),
  ('appt_vina_fut02',  'clinic_vina', 'pat_vina_01', 'usr_doc_multi', 'box_vina_1', NOW() + INTERVAL '6 days' + TIME '11:00', NOW() + INTERVAL '6 days' + TIME '12:00', 'SCHEDULED', 'PENDING', 'Control periodontal', 'usr_sec2', NOW(), NOW());

-- ============================================================================
-- 9. TRATAMIENTOS
-- ============================================================================
INSERT INTO "Treatment" (id, name, price) VALUES
  ('treat_limpieza',    'Limpieza Dental',                   35000.00),
  ('treat_resina',      'Resina Compuesta',                  45000.00),
  ('treat_endodoncia',  'Endodoncia Unirradicular',          120000.00),
  ('treat_endo_multi',  'Endodoncia Multirradicular',        180000.00),
  ('treat_exodoncia',   'Exodoncia Simple',                  40000.00),
  ('treat_exo_comp',    'Exodoncia Compleja',                80000.00),
  ('treat_brackets',    'Instalación Brackets Metálicos',    350000.00),
  ('treat_control_ort', 'Control Ortodoncia Mensual',        25000.00),
  ('treat_blanq',       'Blanqueamiento Dental',             150000.00),
  ('treat_corona',      'Corona Porcelana',                  250000.00),
  ('treat_implante',    'Implante Dental Unitario',          800000.00),
  ('treat_periodoncia', 'Tratamiento Periodontal Completo',  200000.00),
  ('treat_radiografia', 'Radiografía Panorámica',            15000.00),
  ('treat_fluor',       'Aplicación de Flúor',               12000.00);

-- ============================================================================
-- 10. TRATAMIENTOS DE PACIENTE (PatientTreatment)
-- ============================================================================
INSERT INTO "PatientTreatment" (id, "patientId", "treatmentId", "performedAt", "createdAt", "updatedAt") VALUES
  ('ptrt_01', 'pat_stgo_01', 'treat_limpieza',    NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW()),
  ('ptrt_02', 'pat_stgo_01', 'treat_resina',      NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW()),
  ('ptrt_03', 'pat_stgo_02', 'treat_brackets',    NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW()),
  ('ptrt_04', 'pat_stgo_02', 'treat_control_ort', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW()),
  ('ptrt_05', 'pat_stgo_03', 'treat_limpieza',    NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW()),
  ('ptrt_06', 'pat_stgo_05', 'treat_periodoncia', NOW() - INTERVAL '7 days',  NOW() - INTERVAL '7 days',  NOW()),
  ('ptrt_07', 'pat_vina_01', 'treat_endodoncia',  NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', NOW()),
  ('ptrt_08', 'pat_vina_02', 'treat_periodoncia', NOW() - INTERVAL '7 days',  NOW() - INTERVAL '7 days',  NOW()),
  ('ptrt_09', 'pat_stgo_06', 'treat_radiografia', NOW() - INTERVAL '5 days',  NOW() - INTERVAL '5 days',  NOW()),
  ('ptrt_10', 'pat_stgo_07', 'treat_exodoncia',   NOW() - INTERVAL '3 days',  NOW() - INTERVAL '3 days',  NOW()),
  -- Tratamiento futuro pendiente de pago
  ('ptrt_11', 'pat_stgo_04', 'treat_blanq',       NOW() + INTERVAL '2 days',  NOW(),                      NOW());

-- ============================================================================
-- 11. HISTORIAL DE PAGOS (PaymentHistory)
-- ============================================================================
INSERT INTO "PaymentHistory" (id, "patientTreatmentId", "recordedAt", status, amount, notes, "createdAt", "updatedAt") VALUES
  -- Pagos completados
  ('pay_01', 'ptrt_01', NOW() - INTERVAL '30 days', 'PAID',    35000.00,  'Pagado en efectivo',           NOW() - INTERVAL '30 days', NOW()),
  ('pay_02', 'ptrt_02', NOW() - INTERVAL '30 days', 'PAID',    45000.00,  'Pagado con tarjeta débito',    NOW() - INTERVAL '30 days', NOW()),
  ('pay_03', 'ptrt_03', NOW() - INTERVAL '25 days', 'PAID',    350000.00, 'Abono inicial brackets',       NOW() - INTERVAL '25 days', NOW()),
  ('pay_04', 'ptrt_05', NOW() - INTERVAL '20 days', 'PAID',    35000.00,  'Transferencia bancaria',       NOW() - INTERVAL '20 days', NOW()),
  ('pay_05', 'ptrt_07', NOW() - INTERVAL '14 days', 'PAID',    120000.00, 'Pagado al contado',            NOW() - INTERVAL '14 days', NOW()),
  -- Pagos pendientes
  ('pay_06', 'ptrt_04', NOW() - INTERVAL '10 days', 'PENDING', 25000.00,  'Pendiente control ortodoncia', NOW() - INTERVAL '10 days', NOW()),
  ('pay_07', 'ptrt_06', NOW() - INTERVAL '7 days',  'PENDING', 200000.00, 'Primera cuota periodoncia',    NOW() - INTERVAL '7 days',  NOW()),
  ('pay_08', 'ptrt_08', NOW() - INTERVAL '7 days',  'PENDING', 100000.00, 'Abono parcial periodoncia',    NOW() - INTERVAL '7 days',  NOW()),
  ('pay_09', 'ptrt_09', NOW() - INTERVAL '5 days',  'PENDING', 15000.00,  'Pendiente radiografía',        NOW() - INTERVAL '5 days',  NOW()),
  -- Pago condonado
  ('pay_10', 'ptrt_10', NOW() - INTERVAL '3 days',  'WAIVED',  40000.00,  'Condonado por urgencia social', NOW() - INTERVAL '3 days', NOW()),
  -- Pago futuro presupuestado
  ('pay_11', 'ptrt_11', NOW(),                       'PENDING', 150000.00, 'Presupuesto blanqueamiento',    NOW(),                     NOW());

-- ============================================================================
-- 12. VISITAS CLÍNICAS (ClinicalVisit)
-- ============================================================================
INSERT INTO "ClinicalVisit" (id, "clinicId", "patientId", "doctorId", "appointmentId", "startedAt", "createdAt") VALUES
  ('cv_01', 'clinic_santiago', 'pat_stgo_01', 'usr_doc1',      'appt_stgo_past01', NOW() - INTERVAL '30 days' + TIME '09:00', NOW() - INTERVAL '30 days'),
  ('cv_02', 'clinic_santiago', 'pat_stgo_02', 'usr_doc2',      'appt_stgo_past02', NOW() - INTERVAL '25 days' + TIME '10:00', NOW() - INTERVAL '25 days'),
  ('cv_03', 'clinic_santiago', 'pat_stgo_03', 'usr_doc1',      'appt_stgo_past03', NOW() - INTERVAL '20 days' + TIME '11:00', NOW() - INTERVAL '20 days'),
  ('cv_04', 'clinic_santiago', 'pat_stgo_05', 'usr_doc_multi', 'appt_stgo_past06', NOW() - INTERVAL '7 days'  + TIME '15:00', NOW() - INTERVAL '7 days'),
  ('cv_05', 'clinic_vina',     'pat_vina_01', 'usr_doc3',      'appt_vina_past01', NOW() - INTERVAL '14 days' + TIME '09:00', NOW() - INTERVAL '14 days'),
  ('cv_06', 'clinic_vina',     'pat_vina_02', 'usr_doc_multi', 'appt_vina_past02', NOW() - INTERVAL '7 days'  + TIME '10:00', NOW() - INTERVAL '7 days'),
  -- Visita sin appointment (walk-in)
  ('cv_07', 'clinic_santiago', 'pat_stgo_07', 'usr_doc1',      NULL,               NOW() - INTERVAL '3 days'  + TIME '16:00', NOW() - INTERVAL '3 days');

-- ============================================================================
-- 13. OBSERVACIONES CLÍNICAS (Observation)
-- ============================================================================
INSERT INTO "Observation" (id, "clinicId", "patientId", "doctorId", "clinicalVisitId", status, code, "codeSystem", "codeDisplay", "categoryCode", "categorySystem", "categoryDisplay", "valueType", "valueString", "valueQuantity", "valueBoolean", "valueUnit", "effectiveAt", "issuedAt", notes, "createdAt", "updatedAt") VALUES
  -- Observaciones de signos vitales y examen clínico
  ('obs_01', 'clinic_santiago', 'pat_stgo_01', 'usr_doc1', 'cv_01', 'FINAL',       '8310-5',  'http://loinc.org', 'Temperatura corporal',    'vital-signs', 'http://terminology.hl7.org/CodeSystem/observation-category', 'Signos vitales', 'QUANTITY', NULL, 36.5, NULL, '°C', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NULL, NOW() - INTERVAL '30 days', NOW()),
  ('obs_02', 'clinic_santiago', 'pat_stgo_01', 'usr_doc1', 'cv_01', 'FINAL',       '8480-6',  'http://loinc.org', 'Presión arterial sistólica','vital-signs','http://terminology.hl7.org/CodeSystem/observation-category', 'Signos vitales', 'QUANTITY', NULL, 120, NULL, 'mmHg', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NULL, NOW() - INTERVAL '30 days', NOW()),
  ('obs_03', 'clinic_santiago', 'pat_stgo_01', 'usr_doc1', 'cv_01', 'FINAL',       '8462-4',  'http://loinc.org', 'Presión arterial diastólica','vital-signs','http://terminology.hl7.org/CodeSystem/observation-category', 'Signos vitales', 'QUANTITY', NULL, 80, NULL, 'mmHg', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NULL, NOW() - INTERVAL '30 days', NOW()),
  -- Observación de texto libre (examen dental)
  ('obs_04', 'clinic_santiago', 'pat_stgo_01', 'usr_doc1', 'cv_01', 'FINAL',       'dental-exam', 'http://medigest.cl/codes', 'Examen dental completo', 'exam', 'http://terminology.hl7.org/CodeSystem/observation-category', 'Examen', 'STRING', 'Sin caries activas. Leve inflamación gingival en sector anteroinferior. Se recomienda control en 6 meses.', NULL, NULL, NULL, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', 'Paciente colaborador', NOW() - INTERVAL '30 days', NOW()),
  -- Observaciones ortodoncia
  ('obs_05', 'clinic_santiago', 'pat_stgo_02', 'usr_doc2', 'cv_02', 'FINAL',       'ortho-eval', 'http://medigest.cl/codes', 'Evaluación ortodóntica', 'exam', 'http://terminology.hl7.org/CodeSystem/observation-category', 'Examen', 'STRING', 'Maloclusión Clase II. Se instalan brackets metálicos superiores e inferiores. Plan de tratamiento: 18 meses.', NULL, NULL, NULL, NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NULL, NOW() - INTERVAL '25 days', NOW()),
  -- Observación booleana (alergia)
  ('obs_06', 'clinic_santiago', 'pat_stgo_03', 'usr_doc1', 'cv_03', 'FINAL',       'allergy-latex', 'http://medigest.cl/codes', 'Alergia al látex', 'social-history', 'http://terminology.hl7.org/CodeSystem/observation-category', 'Historia social', 'BOOLEAN', NULL, NULL, true, NULL, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', 'Reportado por paciente, confirmado', NOW() - INTERVAL '20 days', NOW()),
  -- Observación periodontal
  ('obs_07', 'clinic_santiago', 'pat_stgo_05', 'usr_doc_multi', 'cv_04', 'FINAL',  'perio-eval', 'http://medigest.cl/codes', 'Evaluación periodontal', 'exam', 'http://terminology.hl7.org/CodeSystem/observation-category', 'Examen', 'STRING', 'Periodontitis crónica moderada generalizada. Bolsas de 4-5mm en sextantes II y V. Se indica fase higiénica.', NULL, NULL, NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NULL, NOW() - INTERVAL '7 days', NOW()),
  -- Observación preliminar (pendiente de confirmar)
  ('obs_08', 'clinic_santiago', 'pat_stgo_05', 'usr_doc_multi', 'cv_04', 'PRELIMINARY', 'perio-risk', 'http://medigest.cl/codes', 'Riesgo periodontal', 'exam', 'http://terminology.hl7.org/CodeSystem/observation-category', 'Examen', 'STRING', 'Alto riesgo. Pendiente resultados de laboratorio.', NULL, NULL, NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', 'Pendiente confirmar con lab', NOW() - INTERVAL '7 days', NOW()),
  -- Observaciones Viña
  ('obs_09', 'clinic_vina', 'pat_vina_01', 'usr_doc3', 'cv_05', 'FINAL',          'endo-eval', 'http://medigest.cl/codes', 'Evaluación endodóntica', 'procedure', 'http://terminology.hl7.org/CodeSystem/observation-category', 'Procedimiento', 'STRING', 'Pulpitis irreversible molar 36. Se realiza pulpectomía y obturación de conductos. Pronóstico favorable.', NULL, NULL, NULL, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', NULL, NOW() - INTERVAL '14 days', NOW()),
  ('obs_10', 'clinic_vina', 'pat_vina_01', 'usr_doc3', 'cv_05', 'FINAL',          '8310-5', 'http://loinc.org', 'Temperatura corporal', 'vital-signs', 'http://terminology.hl7.org/CodeSystem/observation-category', 'Signos vitales', 'QUANTITY', NULL, 36.8, NULL, '°C', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', NULL, NOW() - INTERVAL '14 days', NOW()),
  -- Observación con error (entered-in-error)
  ('obs_11', 'clinic_santiago', 'pat_stgo_07', 'usr_doc1', 'cv_07', 'ENTERED_IN_ERROR', 'dental-exam', 'http://medigest.cl/codes', 'Examen dental', 'exam', 'http://terminology.hl7.org/CodeSystem/observation-category', 'Examen', 'STRING', 'Dato ingresado por error - paciente equivocado', NULL, NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 'ANULADO', NOW() - INTERVAL '3 days', NOW()),
  -- Observación corregida (amended)
  ('obs_12', 'clinic_santiago', 'pat_stgo_07', 'usr_doc1', 'cv_07', 'AMENDED',     'dental-exam', 'http://medigest.cl/codes', 'Examen dental completo', 'exam', 'http://terminology.hl7.org/CodeSystem/observation-category', 'Examen', 'STRING', 'Extracción pieza 4.8 (tercer molar). Procedimiento sin complicaciones. Indicaciones post-operatorias entregadas.', NULL, NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 'Corregido: paciente correcto', NOW() - INTERVAL '3 days', NOW());

-- ============================================================================
-- 14. ALERTAS INTERNAS (InternalAlert + Recipients)
-- ============================================================================
INSERT INTO "InternalAlert" (id, "clinicId", "createdById", "doctorId", "eventType", title, message, "referenceType", "referenceId", "createdAt", "updatedAt") VALUES
  ('alert_01', 'clinic_santiago', 'usr_sec1',  'usr_doc1',      'APPOINTMENT_CREATED',     'Nueva cita agendada',           'Se agendó cita para Juan Pérez el día de mañana.',           'APPOINTMENT', 'appt_stgo_fut01', NOW() - INTERVAL '1 hour', NOW()),
  ('alert_02', 'clinic_santiago', 'usr_sec1',  'usr_doc2',      'APPOINTMENT_CREATED',     'Nueva cita agendada',           'Se agendó cita para Catalina Muñoz.',                        'APPOINTMENT', 'appt_stgo_fut02', NOW() - INTERVAL '30 minutes', NOW()),
  ('alert_03', 'clinic_santiago', 'usr_sec1',  'usr_doc1',      'APPOINTMENT_CANCELLED',   'Cita cancelada',                'La cita de Juan Pérez fue cancelada por el paciente.',        'APPOINTMENT', 'appt_stgo_past05', NOW() - INTERVAL '10 days', NOW()),
  ('alert_04', 'clinic_santiago', 'usr_admin1','usr_doc_multi', 'APPOINTMENT_RESCHEDULED', 'Cita reagendada',               'La cita de Diego Torres fue movida al viernes.',              'APPOINTMENT', 'appt_stgo_fut03', NOW() - INTERVAL '2 hours', NOW()),
  ('alert_05', 'clinic_santiago', 'usr_sec1',  NULL,            'PAYMENT_PENDING',         'Pago pendiente',                'El paciente Roberto Sánchez tiene un pago pendiente de $35.000.', 'PATIENT', 'pat_stgo_03', NOW() - INTERVAL '20 days', NOW()),
  ('alert_06', 'clinic_santiago', 'usr_admin1', NULL,           'CUSTOM',                  'Mantenimiento programado',      'Se realizará mantención del sistema el próximo domingo de 02:00 a 06:00 hrs.', NULL, NULL, NOW() - INTERVAL '5 days', NOW()),
  ('alert_07', 'clinic_santiago', 'usr_sec1',  'usr_doc2',      'APPOINTMENT_CONFLICT',    'Conflicto de horario',          'Se detectó un conflicto de horario para Dra. Soto el martes.', NULL, NULL, NOW() - INTERVAL '3 hours', NOW()),
  -- Viña
  ('alert_08', 'clinic_vina',     'usr_sec2',  'usr_doc3',      'APPOINTMENT_CREATED',     'Nueva cita agendada',           'Se agendó cita para Javiera Fuentes.',                       'APPOINTMENT', 'appt_vina_fut01', NOW() - INTERVAL '45 minutes', NOW()),
  ('alert_09', 'clinic_vina',     'usr_sec2',  'usr_doc_multi', 'APPOINTMENT_CREATED',     'Nueva cita agendada',           'Se agendó cita para Tomás Morales.',                         'APPOINTMENT', 'appt_vina_fut02', NOW() - INTERVAL '20 minutes', NOW());

INSERT INTO "InternalAlertRecipient" (id, "alertId", "userId", "deliveryStatus", "deliveryError", "deliveredAt", "readAt", "createdAt", "updatedAt") VALUES
  -- Alertas leídas
  ('arec_01', 'alert_01', 'usr_doc1',      'SENT', NULL,                       NOW() - INTERVAL '59 minutes', NOW() - INTERVAL '50 minutes', NOW() - INTERVAL '1 hour', NOW()),
  ('arec_02', 'alert_01', 'usr_admin1',    'SENT', NULL,                       NOW() - INTERVAL '59 minutes', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '1 hour', NOW()),
  ('arec_03', 'alert_03', 'usr_doc1',      'SENT', NULL,                       NOW() - INTERVAL '10 days',    NOW() - INTERVAL '10 days',    NOW() - INTERVAL '10 days', NOW()),
  ('arec_04', 'alert_03', 'usr_admin1',    'SENT', NULL,                       NOW() - INTERVAL '10 days',    NOW() - INTERVAL '9 days',     NOW() - INTERVAL '10 days', NOW()),
  -- Alertas no leídas
  ('arec_05', 'alert_02', 'usr_doc2',      'SENT', NULL,                       NOW() - INTERVAL '29 minutes', NULL, NOW() - INTERVAL '30 minutes', NOW()),
  ('arec_06', 'alert_02', 'usr_admin1',    'SENT', NULL,                       NOW() - INTERVAL '29 minutes', NULL, NOW() - INTERVAL '30 minutes', NOW()),
  ('arec_07', 'alert_04', 'usr_doc_multi', 'SENT', NULL,                       NOW() - INTERVAL '2 hours',    NULL, NOW() - INTERVAL '2 hours', NOW()),
  ('arec_08', 'alert_05', 'usr_admin1',    'SENT', NULL,                       NOW() - INTERVAL '20 days',    NULL, NOW() - INTERVAL '20 days', NOW()),
  ('arec_09', 'alert_06', 'usr_doc1',      'SENT', NULL,                       NOW() - INTERVAL '5 days',     NULL, NOW() - INTERVAL '5 days', NOW()),
  ('arec_10', 'alert_06', 'usr_doc2',      'SENT', NULL,                       NOW() - INTERVAL '5 days',     NULL, NOW() - INTERVAL '5 days', NOW()),
  ('arec_11', 'alert_06', 'usr_sec1',      'SENT', NULL,                       NOW() - INTERVAL '5 days',     NULL, NOW() - INTERVAL '5 days', NOW()),
  ('arec_12', 'alert_07', 'usr_doc2',      'SENT', NULL,                       NOW() - INTERVAL '3 hours',    NULL, NOW() - INTERVAL '3 hours', NOW()),
  -- Entrega fallida
  ('arec_13', 'alert_06', 'usr_doc_multi', 'FAILED', 'SMTP timeout: no response from mail server', NULL, NULL, NOW() - INTERVAL '5 days', NOW()),
  -- Viña
  ('arec_14', 'alert_08', 'usr_doc3',      'SENT', NULL,                       NOW() - INTERVAL '44 minutes', NULL, NOW() - INTERVAL '45 minutes', NOW()),
  ('arec_15', 'alert_09', 'usr_doc_multi', 'SENT', NULL,                       NOW() - INTERVAL '19 minutes', NULL, NOW() - INTERVAL '20 minutes', NOW()),
  ('arec_16', 'alert_09', 'usr_admin2',    'SENT', NULL,                       NOW() - INTERVAL '19 minutes', NULL, NOW() - INTERVAL '20 minutes', NOW());

-- ============================================================================
-- 15. FHIR LINKS (mapeo de IDs internos a FHIR)
-- ============================================================================
INSERT INTO "FhirLink" (id, "clinicId", "resourceType", "internalId", "fhirId", "identifierSystem", "identifierValue", "identifierKey", "createdAt", "updatedAt") VALUES
  -- Pacientes mapeados a FHIR
  ('fhir_pat01', 'clinic_santiago', 'PATIENT', 'pat_stgo_01', 'fhir-pat-stgo-01', 'http://medigest.cl/fhir/patient-run', '101001001', 'run:101001001', NOW(), NOW()),
  ('fhir_pat02', 'clinic_santiago', 'PATIENT', 'pat_stgo_02', 'fhir-pat-stgo-02', 'http://medigest.cl/fhir/patient-run', '102002002', 'run:102002002', NOW(), NOW()),
  ('fhir_pat03', 'clinic_santiago', 'PATIENT', 'pat_stgo_03', 'fhir-pat-stgo-03', 'http://medigest.cl/fhir/patient-run', '103003003', 'run:103003003', NOW(), NOW()),
  ('fhir_patv1', 'clinic_vina',     'PATIENT', 'pat_vina_01', 'fhir-pat-vina-01', 'http://medigest.cl/fhir/patient-run', '201001001', 'run:201001001', NOW(), NOW()),
  -- Appointments mapeados a FHIR
  ('fhir_appt01', 'clinic_santiago', 'APPOINTMENT', 'appt_stgo_past01', 'fhir-appt-01', NULL, NULL, NULL, NOW(), NOW()),
  ('fhir_appt02', 'clinic_santiago', 'APPOINTMENT', 'appt_stgo_today01','fhir-appt-02', NULL, NULL, NULL, NOW(), NOW()),
  -- Observations mapeadas a FHIR
  ('fhir_obs01', 'clinic_santiago', 'OBSERVATION', 'obs_01', 'fhir-obs-01', NULL, NULL, NULL, NOW(), NOW()),
  ('fhir_obs02', 'clinic_santiago', 'OBSERVATION', 'obs_04', 'fhir-obs-04', NULL, NULL, NULL, NOW(), NOW()),
  ('fhir_obsv1', 'clinic_vina',     'OBSERVATION', 'obs_09', 'fhir-obs-v01', NULL, NULL, NULL, NOW(), NOW());

-- ============================================================================
-- 16. AUDIT LOG (eventos de auditoría)
-- ============================================================================
INSERT INTO "AuditLog" (id, "occurredAt", event, author, detail) VALUES
  ('audit_01', NOW() - INTERVAL '90 days', 'USER_CREATED',        'system',                      'Usuario admin.test@medigest.cl creado por seed'),
  ('audit_02', NOW() - INTERVAL '80 days', 'USER_CREATED',        'admin.test@medigest.cl',      'Doctor doctor1.test@medigest.cl registrado'),
  ('audit_03', NOW() - INTERVAL '60 days', 'PATIENT_CREATED',     'secretaria1.test@medigest.cl','Paciente Juan Pérez (10.100.100-1) registrado'),
  ('audit_04', NOW() - INTERVAL '31 days', 'APPOINTMENT_CREATED', 'secretaria1.test@medigest.cl','Cita creada para Juan Pérez con Dr. Muñoz'),
  ('audit_05', NOW() - INTERVAL '30 days', 'LOGIN_SUCCESS',       'doctor1.test@medigest.cl',    'Inicio de sesión exitoso'),
  ('audit_06', NOW() - INTERVAL '30 days', 'APPOINTMENT_COMPLETED','doctor1.test@medigest.cl',   'Cita appt_stgo_past01 completada'),
  ('audit_07', NOW() - INTERVAL '25 days', 'APPOINTMENT_CREATED', 'secretaria1.test@medigest.cl','Cita creada para Ana García con Dra. Soto'),
  ('audit_08', NOW() - INTERVAL '11 days', 'APPOINTMENT_CANCELLED','secretaria1.test@medigest.cl','Cita appt_stgo_past05 cancelada por paciente'),
  ('audit_09', NOW() - INTERVAL '5 days',  'LOGIN_FAILED',        'hacker@evil.com',             'Intento de login fallido - usuario no existe'),
  ('audit_10', NOW() - INTERVAL '3 days',  'PAYMENT_WAIVED',      'admin.test@medigest.cl',      'Pago condonado para Matías López - exodoncia'),
  ('audit_11', NOW() - INTERVAL '1 day',   'LOGIN_SUCCESS',       'admin.test@medigest.cl',      'Inicio de sesión exitoso'),
  ('audit_12', NOW() - INTERVAL '1 hour',  'APPOINTMENT_CREATED', 'secretaria1.test@medigest.cl','Cita creada para Juan Pérez mañana'),
  ('audit_13', NOW(),                       'SEED_EXECUTED',       'system',                      'Test seed SQL ejecutado exitosamente');

-- ============================================================================
-- 17. VERIFICATION TOKEN (para testear flujos de verificación)
-- ============================================================================
INSERT INTO "VerificationToken" (identifier, token, expires) VALUES
  ('pending@medigest.cl', 'vtoken_test_valid_123456', NOW() + INTERVAL '24 hours'),
  ('expired@medigest.cl', 'vtoken_test_expired_789',  NOW() - INTERVAL '1 hour');

COMMIT;

-- ============================================================================
-- RESUMEN DE DATOS INSERTADOS
-- ============================================================================
-- Clínicas:        3 (2 activas + 1 inactiva)
-- Usuarios:       11 (2 admin, 4 doctores, 2 secretarias, 1 suspendido, 1 pendiente, 1 mustChange)
-- UserProfile:    11
-- DoctorProfile:   6 (4 activos + 1 inactivo + 1 mustChange)
-- Membresías:     11 (multi-clínica incluida)
-- Boxes:           7 (5 Santiago + 2 Viña, 1 deshabilitado)
-- Pacientes:      12 (8 Santiago + 4 Viña, 1 inactivo)
-- Appointments:   21 (6 pasadas + 4 hoy + 5 futuras Santiago, 2 pasadas + 1 hoy + 2 futuras Viña)
-- Tratamientos:   14 (catálogo completo dental)
-- PatientTreat:   11 (tratamientos realizados/pendientes)
-- PaymentHistory: 11 (5 PAID + 5 PENDING + 1 WAIVED)
-- ClinicalVisits:  7 (5 con appointment + 1 walk-in)
-- Observations:   12 (vitales, texto, booleano, preliminar, error, amended)
-- InternalAlerts:  9 (todos los tipos de evento)
-- AlertRecipients:16 (leídas, no leídas, fallida)
-- FhirLinks:       9 (Patient, Appointment, Observation)
-- AuditLog:       13 (login, CRUD, errores)
-- VerifTokens:     2 (1 válido + 1 expirado)
--
-- CREDENCIALES DE TEST:
-- ┌─────────────┬──────────────────────────────────┬────────────┐
-- │ Rol         │ Email                            │ Password   │
-- ├─────────────┼──────────────────────────────────┼────────────┤
-- │ ADMIN       │ admin.test@medigest.cl            │ Test1234!  │
-- │ ADMIN       │ admin2.test@medigest.cl           │ Test1234!  │
-- │ DOCTOR      │ doctor1.test@medigest.cl          │ Test1234!  │
-- │ DOCTOR      │ doctor2.test@medigest.cl          │ Test1234!  │
-- │ DOCTOR      │ doctor3.test@medigest.cl          │ Test1234!  │
-- │ DOCTOR      │ doctor.multi@medigest.cl          │ Test1234!  │
-- │ SECRETARY   │ secretaria1.test@medigest.cl      │ Test1234!  │
-- │ SECRETARY   │ secretaria2.test@medigest.cl      │ Test1234!  │
-- │ SUSPENDED   │ suspended@medigest.cl             │ Test1234!  │
-- │ PENDING     │ pending@medigest.cl               │ Test1234!  │
-- │ MUST_CHANGE │ mustchange@medigest.cl            │ Test1234!  │
-- └─────────────┴──────────────────────────────────┴────────────┘
