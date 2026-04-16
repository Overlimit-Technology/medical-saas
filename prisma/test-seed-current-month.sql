-- ============================================================================
-- MediGest - Seed completo del mes actual
-- Genera datos amplios para agenda, pacientes, CRM, formularios, clínica,
-- FHIR, alertas y auth sin borrar datos reales: solo limpia registros seed_cm_.
--
-- Password para todos los usuarios activos de este seed: Test1234!
-- Hash bcrypt usado: $2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. LIMPIEZA DE EJECUCIONES PREVIAS DEL MISMO SEED
-- ============================================================================
DELETE FROM "InternalAlertRecipient"
WHERE id LIKE 'seed_cm_%' OR "alertId" LIKE 'seed_cm_%' OR "userId" LIKE 'seed_cm_%';

DELETE FROM "ClinicalRecordValue"
WHERE id LIKE 'seed_cm_%' OR "clinicalRecordId" LIKE 'seed_cm_%' OR "fieldId" LIKE 'seed_cm_%';

DELETE FROM "CrmLeadActivity"
WHERE id LIKE 'seed_cm_%' OR "leadId" LIKE 'seed_cm_%';

DELETE FROM "CrmLeadMessage"
WHERE id LIKE 'seed_cm_%' OR "leadId" LIKE 'seed_cm_%';

DELETE FROM "CrmLeadNote"
WHERE id LIKE 'seed_cm_%' OR "leadId" LIKE 'seed_cm_%';

DELETE FROM "PaymentHistory"
WHERE id LIKE 'seed_cm_%' OR "patientTreatmentId" LIKE 'seed_cm_%';

DELETE FROM "ClinicalRecord"
WHERE id LIKE 'seed_cm_%'
   OR "appointmentId" LIKE 'seed_cm_%'
   OR "templateId" LIKE 'seed_cm_%'
   OR "patientId" LIKE 'seed_cm_%'
   OR "doctorId" LIKE 'seed_cm_%';

DELETE FROM "Observation"
WHERE id LIKE 'seed_cm_%'
   OR "clinicalVisitId" LIKE 'seed_cm_%'
   OR "patientId" LIKE 'seed_cm_%'
   OR "doctorId" LIKE 'seed_cm_%';

DELETE FROM "ClinicalVisit"
WHERE id LIKE 'seed_cm_%'
   OR "appointmentId" LIKE 'seed_cm_%'
   OR "patientId" LIKE 'seed_cm_%'
   OR "doctorId" LIKE 'seed_cm_%';

DELETE FROM "PatientTreatment"
WHERE id LIKE 'seed_cm_%'
   OR "patientId" LIKE 'seed_cm_%'
   OR "treatmentId" LIKE 'seed_cm_%';

DELETE FROM "FhirLink"
WHERE id LIKE 'seed_cm_%'
   OR "clinicId" LIKE 'seed_cm_%'
   OR "internalId" LIKE 'seed_cm_%'
   OR "fhirId" LIKE 'seed_cm_%';

DELETE FROM "InternalAlert"
WHERE id LIKE 'seed_cm_%'
   OR "clinicId" LIKE 'seed_cm_%'
   OR "createdById" LIKE 'seed_cm_%'
   OR "doctorId" LIKE 'seed_cm_%'
   OR "referenceId" LIKE 'seed_cm_%';

DELETE FROM "Appointment"
WHERE id LIKE 'seed_cm_%'
   OR "clinicId" LIKE 'seed_cm_%'
   OR "patientId" LIKE 'seed_cm_%'
   OR "doctorId" LIKE 'seed_cm_%'
   OR "boxId" LIKE 'seed_cm_%'
   OR "createdBy" LIKE 'seed_cm_%';

DELETE FROM "CrmLead"
WHERE id LIKE 'seed_cm_%'
   OR "clinicId" LIKE 'seed_cm_%'
   OR "columnId" LIKE 'seed_cm_%'
   OR "assignedDoctorId" LIKE 'seed_cm_%'
   OR email LIKE '%@seed.medigest.test';

DELETE FROM "LeadColumn"
WHERE id LIKE 'seed_cm_%' OR "clinicId" LIKE 'seed_cm_%';

DELETE FROM "FormTemplateField"
WHERE id LIKE 'seed_cm_%' OR "templateId" LIKE 'seed_cm_%';

DELETE FROM "FormTemplate"
WHERE id LIKE 'seed_cm_%' OR "clinicId" LIKE 'seed_cm_%';

DELETE FROM "Box"
WHERE id LIKE 'seed_cm_%' OR "clinicId" LIKE 'seed_cm_%';

DELETE FROM "Patient"
WHERE id LIKE 'seed_cm_%'
   OR "clinicId" LIKE 'seed_cm_%'
   OR email LIKE '%@seed.medigest.test';

DELETE FROM "DoctorProfile"
WHERE id LIKE 'seed_cm_%' OR "userId" LIKE 'seed_cm_%';

DELETE FROM "ClinicMembership"
WHERE id LIKE 'seed_cm_%' OR "userId" LIKE 'seed_cm_%' OR "clinicId" LIKE 'seed_cm_%';

DELETE FROM "ClinicSettings"
WHERE id LIKE 'seed_cm_%' OR "clinicId" LIKE 'seed_cm_%';

DELETE FROM "Session"
WHERE id LIKE 'seed_cm_%' OR "userId" LIKE 'seed_cm_%' OR "sessionToken" LIKE 'seed_cm_%';

DELETE FROM "Account"
WHERE id LIKE 'seed_cm_%' OR "userId" LIKE 'seed_cm_%' OR provider = 'seed-google';

DELETE FROM "VerificationToken"
WHERE identifier LIKE 'seed+%@medigest.test' OR token LIKE 'seed_cm_%';

DELETE FROM "AuditLog"
WHERE id LIKE 'seed_cm_%'
   OR author LIKE '%@seed.medigest.test'
   OR event LIKE 'SEED_CM_%';

DELETE FROM "UserProfile"
WHERE id LIKE 'seed_cm_%' OR "userId" LIKE 'seed_cm_%' OR rut LIKE 'SEEDCM-%';

DELETE FROM "User"
WHERE id LIKE 'seed_cm_%' OR email LIKE '%@seed.medigest.test';

DELETE FROM "Clinic"
WHERE id LIKE 'seed_cm_%';

DELETE FROM "Treatment"
WHERE id LIKE 'seed_cm_%' OR name LIKE 'Seed CM - %';

-- ============================================================================
-- 1. CLINICAS, CONFIGURACION Y AUTH BASE
-- ============================================================================
INSERT INTO "Clinic" (id, name, city, "isActive", "createdAt", "updatedAt") VALUES
  ('seed_cm_clinic_centro', 'MediGest Centro', 'Santiago', true, NOW() - INTERVAL '180 days', NOW()),
  ('seed_cm_clinic_norte', 'MediGest Norte', 'Antofagasta', true, NOW() - INTERVAL '150 days', NOW()),
  ('seed_cm_clinic_laboratorio', 'MediGest Laboratorio', 'La Serena', false, NOW() - INTERVAL '120 days', NOW());

INSERT INTO "ClinicSettings" (id, "clinicId", "statusColors", "createdAt", "updatedAt") VALUES
  (
    'seed_cm_settings_centro',
    'seed_cm_clinic_centro',
    '{"SCHEDULED":"blue","CONFIRMED":"teal","CANCELLED":"rose","COMPLETED":"emerald","NO_SHOW":"amber"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'seed_cm_settings_norte',
    'seed_cm_clinic_norte',
    '{"SCHEDULED":"indigo","CONFIRMED":"cyan","CANCELLED":"pink","COMPLETED":"emerald","NO_SHOW":"orange"}'::jsonb,
    NOW(),
    NOW()
  );

INSERT INTO "User" (
  id, email, name, "passwordHash", "mustChangePassword", role, status,
  "isSuperAdmin", permissions, "createdAt", "updatedAt", "lastLoginAt"
) VALUES
  (
    'seed_cm_usr_admin',
    'admin.seed@medigest.test',
    'Paula Admin Seed',
    '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq',
    false,
    'ADMIN',
    'ACTIVE',
    true,
    ARRAY['AGENDA','CLINICAL_VISITS','PATIENTS','TREATMENTS','LEADS','USERS','CHAT','CHAT_META']::text[],
    NOW() - INTERVAL '220 days',
    NOW(),
    NOW() - INTERVAL '40 minutes'
  ),
  (
    'seed_cm_usr_admin_ops',
    'admin.ops.seed@medigest.test',
    'Matias Operaciones Seed',
    '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq',
    false,
    'ADMIN',
    'ACTIVE',
    true,
    ARRAY['AGENDA','CLINICAL_VISITS','PATIENTS','TREATMENTS','LEADS','USERS','CHAT','CHAT_META']::text[],
    NOW() - INTERVAL '200 days',
    NOW(),
    NOW() - INTERVAL '3 hours'
  ),
  (
    'seed_cm_usr_doc_general',
    'doctor.general.seed@medigest.test',
    'Dra. Emilia Navarro',
    '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq',
    false,
    'DOCTOR',
    'ACTIVE',
    false,
    ARRAY['AGENDA','CLINICAL_VISITS','CHAT','TREATMENTS']::text[],
    NOW() - INTERVAL '170 days',
    NOW(),
    NOW() - INTERVAL '1 hour'
  ),
  (
    'seed_cm_usr_doc_ortho',
    'doctor.ortho.seed@medigest.test',
    'Dr. Tomas Fuentes',
    '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq',
    false,
    'DOCTOR',
    'ACTIVE',
    false,
    ARRAY['AGENDA','CLINICAL_VISITS','CHAT','TREATMENTS']::text[],
    NOW() - INTERVAL '165 days',
    NOW(),
    NOW() - INTERVAL '2 hours'
  ),
  (
    'seed_cm_usr_doc_endo',
    'doctor.endo.seed@medigest.test',
    'Dra. Antonia Vergara',
    '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq',
    false,
    'DOCTOR',
    'ACTIVE',
    false,
    ARRAY['AGENDA','CLINICAL_VISITS','CHAT','TREATMENTS']::text[],
    NOW() - INTERVAL '160 days',
    NOW(),
    NOW() - INTERVAL '5 hours'
  ),
  (
    'seed_cm_usr_doc_implants',
    'doctor.implants.seed@medigest.test',
    'Dr. Vicente Rojas',
    '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq',
    false,
    'DOCTOR',
    'ACTIVE',
    false,
    ARRAY['AGENDA','CLINICAL_VISITS','CHAT','TREATMENTS']::text[],
    NOW() - INTERVAL '158 days',
    NOW(),
    NOW() - INTERVAL '1 day'
  ),
  (
    'seed_cm_usr_doc_multi',
    'doctor.multi.seed@medigest.test',
    'Dra. Isidora Campos',
    '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq',
    false,
    'DOCTOR',
    'ACTIVE',
    false,
    ARRAY['AGENDA','CLINICAL_VISITS','CHAT','TREATMENTS']::text[],
    NOW() - INTERVAL '155 days',
    NOW(),
    NOW() - INTERVAL '20 minutes'
  ),
  (
    'seed_cm_usr_sec_centro',
    'secretaria.centro.seed@medigest.test',
    'Camila Secretaria Centro',
    '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq',
    false,
    'SECRETARY',
    'ACTIVE',
    false,
    ARRAY['AGENDA','PATIENTS','CHAT','CHAT_META','LEADS','USERS']::text[],
    NOW() - INTERVAL '172 days',
    NOW(),
    NOW() - INTERVAL '30 minutes'
  ),
  (
    'seed_cm_usr_sec_norte',
    'secretaria.norte.seed@medigest.test',
    'Josefa Secretaria Norte',
    '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq',
    false,
    'SECRETARY',
    'ACTIVE',
    false,
    ARRAY['AGENDA','PATIENTS','CHAT','CHAT_META','LEADS','USERS']::text[],
    NOW() - INTERVAL '168 days',
    NOW(),
    NOW() - INTERVAL '4 hours'
  ),
  (
    'seed_cm_usr_doc_suspended',
    'doctor.suspended.seed@medigest.test',
    'Dr. Rodrigo Suspendido',
    '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq',
    false,
    'DOCTOR',
    'SUSPENDED',
    false,
    ARRAY['AGENDA','CLINICAL_VISITS','CHAT','TREATMENTS']::text[],
    NOW() - INTERVAL '190 days',
    NOW(),
    NOW() - INTERVAL '35 days'
  ),
  (
    'seed_cm_usr_sec_pending',
    'secretaria.pending.seed@medigest.test',
    'Mariana Pendiente',
    '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq',
    true,
    'SECRETARY',
    'PENDING',
    false,
    ARRAY['AGENDA','PATIENTS','CHAT']::text[],
    NOW() - INTERVAL '4 days',
    NOW(),
    NULL
  ),
  (
    'seed_cm_usr_doc_new',
    'doctor.nuevo.seed@medigest.test',
    'Dra. Renata Ingreso',
    '$2b$10$MIyvJYpsIHSPrICAspagAOWq911C19L8kiIeDKmjmDOiic16JNBAq',
    true,
    'DOCTOR',
    'ACTIVE',
    false,
    ARRAY['AGENDA','CLINICAL_VISITS','CHAT','TREATMENTS']::text[],
    NOW() - INTERVAL '2 days',
    NOW(),
    NULL
  );

INSERT INTO "UserProfile" (id, "userId", "firstName", "lastName", phone, rut, "createdAt", "updatedAt") VALUES
  ('seed_cm_prof_admin', 'seed_cm_usr_admin', 'Paula', 'Admin', '+56960100001', 'SEEDCM-ADM-01', NOW(), NOW()),
  ('seed_cm_prof_admin_ops', 'seed_cm_usr_admin_ops', 'Matias', 'Operaciones', '+56960100002', 'SEEDCM-ADM-02', NOW(), NOW()),
  ('seed_cm_prof_doc_general', 'seed_cm_usr_doc_general', 'Emilia', 'Navarro', '+56960200001', 'SEEDCM-DOC-01', NOW(), NOW()),
  ('seed_cm_prof_doc_ortho', 'seed_cm_usr_doc_ortho', 'Tomas', 'Fuentes', '+56960200002', 'SEEDCM-DOC-02', NOW(), NOW()),
  ('seed_cm_prof_doc_endo', 'seed_cm_usr_doc_endo', 'Antonia', 'Vergara', '+56960200003', 'SEEDCM-DOC-03', NOW(), NOW()),
  ('seed_cm_prof_doc_implants', 'seed_cm_usr_doc_implants', 'Vicente', 'Rojas', '+56960200004', 'SEEDCM-DOC-04', NOW(), NOW()),
  ('seed_cm_prof_doc_multi', 'seed_cm_usr_doc_multi', 'Isidora', 'Campos', '+56960200005', 'SEEDCM-DOC-05', NOW(), NOW()),
  ('seed_cm_prof_sec_centro', 'seed_cm_usr_sec_centro', 'Camila', 'Maturana', '+56960300001', 'SEEDCM-SEC-01', NOW(), NOW()),
  ('seed_cm_prof_sec_norte', 'seed_cm_usr_sec_norte', 'Josefa', 'Contreras', '+56960300002', 'SEEDCM-SEC-02', NOW(), NOW()),
  ('seed_cm_prof_doc_suspended', 'seed_cm_usr_doc_suspended', 'Rodrigo', 'Suspendido', '+56960200006', 'SEEDCM-DOC-06', NOW(), NOW()),
  ('seed_cm_prof_sec_pending', 'seed_cm_usr_sec_pending', 'Mariana', 'Pendiente', '+56960300003', 'SEEDCM-SEC-03', NOW(), NOW()),
  ('seed_cm_prof_doc_new', 'seed_cm_usr_doc_new', 'Renata', 'Ingreso', '+56960200007', 'SEEDCM-DOC-07', NOW(), NOW());

INSERT INTO "DoctorProfile" (
  id, "userId", rut, "rutNormalized", specialty, bio, "isActive", "createdAt", "updatedAt"
) VALUES
  ('seed_cm_dprof_general', 'seed_cm_usr_doc_general', '11.100.001-1', '111000011', 'Odontologia General', 'Controles integrales y rehabilitacion preventiva.', true, NOW(), NOW()),
  ('seed_cm_dprof_ortho', 'seed_cm_usr_doc_ortho', '11.100.002-2', '111000022', 'Ortodoncia', 'Seguimiento de alineadores y brackets.', true, NOW(), NOW()),
  ('seed_cm_dprof_endo', 'seed_cm_usr_doc_endo', '11.100.003-3', '111000033', 'Endodoncia', 'Resolucion de urgencias y tratamientos de conducto.', true, NOW(), NOW()),
  ('seed_cm_dprof_implants', 'seed_cm_usr_doc_implants', '11.100.004-4', '111000044', 'Implantologia', 'Planificacion de implantes y controles postoperatorios.', true, NOW(), NOW()),
  ('seed_cm_dprof_multi', 'seed_cm_usr_doc_multi', '11.100.005-5', '111000055', 'Periodoncia', 'Atencion compartida entre sedes para tratamientos periodontales.', true, NOW(), NOW()),
  ('seed_cm_dprof_suspended', 'seed_cm_usr_doc_suspended', '11.100.006-6', '111000066', 'Cirugia Oral', 'Usuario suspendido para probar restricciones de acceso.', false, NOW(), NOW()),
  ('seed_cm_dprof_new', 'seed_cm_usr_doc_new', '11.100.007-7', '111000077', 'Odontologia General', 'Ingreso reciente que debe cambiar su password.', true, NOW(), NOW());

INSERT INTO "Session" (id, "sessionToken", "userId", expires) VALUES
  ('seed_cm_session_admin', 'seed_cm_session_admin_token', 'seed_cm_usr_admin', NOW() + INTERVAL '14 days'),
  ('seed_cm_session_doc_general', 'seed_cm_session_doc_general_token', 'seed_cm_usr_doc_general', NOW() + INTERVAL '10 days'),
  ('seed_cm_session_sec_centro', 'seed_cm_session_sec_centro_token', 'seed_cm_usr_sec_centro', NOW() + INTERVAL '10 days');

INSERT INTO "Account" (
  id, "userId", type, provider, "providerAccountId",
  "refresh_token", "access_token", expires_at, token_type, scope, "id_token", "session_state"
) VALUES
  (
    'seed_cm_account_admin_google',
    'seed_cm_usr_admin',
    'oauth',
    'seed-google',
    'seed-google-admin-001',
    NULL,
    'seed_cm_access_token_admin',
    NULL,
    'Bearer',
    'email profile openid',
    NULL,
    NULL
  ),
  (
    'seed_cm_account_admin_ops_google',
    'seed_cm_usr_admin_ops',
    'oauth',
    'seed-google',
    'seed-google-admin-002',
    NULL,
    'seed_cm_access_token_admin_ops',
    NULL,
    'Bearer',
    'email profile openid',
    NULL,
    NULL
  );

INSERT INTO "VerificationToken" (identifier, token, expires) VALUES
  ('seed+activation@medigest.test', 'seed_cm_token_activation', NOW() + INTERVAL '24 hours'),
  ('seed+expired@medigest.test', 'seed_cm_token_expired', NOW() - INTERVAL '6 hours');

INSERT INTO "ClinicMembership" (id, "userId", "clinicId", status, "createdAt", "updatedAt") VALUES
  ('seed_cm_mem_admin_centro', 'seed_cm_usr_admin', 'seed_cm_clinic_centro', 'ACTIVE', NOW(), NOW()),
  ('seed_cm_mem_admin_norte', 'seed_cm_usr_admin', 'seed_cm_clinic_norte', 'ACTIVE', NOW(), NOW()),
  ('seed_cm_mem_admin_ops_centro', 'seed_cm_usr_admin_ops', 'seed_cm_clinic_centro', 'ACTIVE', NOW(), NOW()),
  ('seed_cm_mem_admin_ops_norte', 'seed_cm_usr_admin_ops', 'seed_cm_clinic_norte', 'ACTIVE', NOW(), NOW()),
  ('seed_cm_mem_doc_general_centro', 'seed_cm_usr_doc_general', 'seed_cm_clinic_centro', 'ACTIVE', NOW(), NOW()),
  ('seed_cm_mem_doc_ortho_centro', 'seed_cm_usr_doc_ortho', 'seed_cm_clinic_centro', 'ACTIVE', NOW(), NOW()),
  ('seed_cm_mem_doc_multi_centro', 'seed_cm_usr_doc_multi', 'seed_cm_clinic_centro', 'ACTIVE', NOW(), NOW()),
  ('seed_cm_mem_sec_centro', 'seed_cm_usr_sec_centro', 'seed_cm_clinic_centro', 'ACTIVE', NOW(), NOW()),
  ('seed_cm_mem_sec_pending_centro', 'seed_cm_usr_sec_pending', 'seed_cm_clinic_centro', 'ACTIVE', NOW(), NOW()),
  ('seed_cm_mem_doc_endo_norte', 'seed_cm_usr_doc_endo', 'seed_cm_clinic_norte', 'ACTIVE', NOW(), NOW()),
  ('seed_cm_mem_doc_implants_norte', 'seed_cm_usr_doc_implants', 'seed_cm_clinic_norte', 'ACTIVE', NOW(), NOW()),
  ('seed_cm_mem_doc_multi_norte', 'seed_cm_usr_doc_multi', 'seed_cm_clinic_norte', 'ACTIVE', NOW(), NOW()),
  ('seed_cm_mem_doc_new_norte', 'seed_cm_usr_doc_new', 'seed_cm_clinic_norte', 'ACTIVE', NOW(), NOW()),
  ('seed_cm_mem_sec_norte', 'seed_cm_usr_sec_norte', 'seed_cm_clinic_norte', 'ACTIVE', NOW(), NOW()),
  ('seed_cm_mem_doc_suspended_centro', 'seed_cm_usr_doc_suspended', 'seed_cm_clinic_centro', 'INACTIVE', NOW(), NOW());

INSERT INTO "Box" (id, "clinicId", name, "isActive", "createdAt", "updatedAt") VALUES
  ('seed_cm_box_ctro_1', 'seed_cm_clinic_centro', 'Box A', true, NOW(), NOW()),
  ('seed_cm_box_ctro_2', 'seed_cm_clinic_centro', 'Box B', true, NOW(), NOW()),
  ('seed_cm_box_ctro_3', 'seed_cm_clinic_centro', 'Box C', true, NOW(), NOW()),
  ('seed_cm_box_ctro_img', 'seed_cm_clinic_centro', 'Radiologia', true, NOW(), NOW()),
  ('seed_cm_box_ctro_old', 'seed_cm_clinic_centro', 'Box Cerrado', false, NOW(), NOW()),
  ('seed_cm_box_nrt_1', 'seed_cm_clinic_norte', 'Modulo 1', true, NOW(), NOW()),
  ('seed_cm_box_nrt_2', 'seed_cm_clinic_norte', 'Modulo 2', true, NOW(), NOW()),
  ('seed_cm_box_nrt_3', 'seed_cm_clinic_norte', 'Modulo 3', true, NOW(), NOW()),
  ('seed_cm_box_nrt_old', 'seed_cm_clinic_norte', 'Modulo Fuera de Servicio', false, NOW(), NOW());

INSERT INTO "Treatment" (id, name, price) VALUES
  ('seed_cm_trt_eval', 'Seed CM - Evaluacion Integral', 22000),
  ('seed_cm_trt_profilaxis', 'Seed CM - Profilaxis y Destartraje', 28000),
  ('seed_cm_trt_ortho_control', 'Seed CM - Control Ortodoncia', 35000),
  ('seed_cm_trt_brackets', 'Seed CM - Ajuste de Brackets', 42000),
  ('seed_cm_trt_endodoncia', 'Seed CM - Endodoncia Unirradicular', 89000),
  ('seed_cm_trt_implante', 'Seed CM - Control Implantologico', 96000),
  ('seed_cm_trt_perio', 'Seed CM - Terapia Periodontal', 54000),
  ('seed_cm_trt_urgencia', 'Seed CM - Atencion de Urgencia', 30000),
  ('seed_cm_trt_radiografia', 'Seed CM - Radiografia Panoramica', 18000),
  ('seed_cm_trt_cirugia', 'Seed CM - Cirugia Menor', 125000);

INSERT INTO "FormTemplate" (id, "clinicId", name, description, "isActive", "createdAt", "updatedAt") VALUES
  ('seed_cm_tpl_eval_ctro', 'seed_cm_clinic_centro', 'Ingreso Clinico Centro', 'Plantilla amplia de primera evaluacion.', true, NOW(), NOW()),
  ('seed_cm_tpl_control_ctro', 'seed_cm_clinic_centro', 'Control Tratamiento Centro', 'Seguimiento de tratamientos en curso.', true, NOW(), NOW()),
  ('seed_cm_tpl_eval_nrt', 'seed_cm_clinic_norte', 'Ingreso Clinico Norte', 'Plantilla amplia de primera evaluacion.', true, NOW(), NOW()),
  ('seed_cm_tpl_control_nrt', 'seed_cm_clinic_norte', 'Control Tratamiento Norte', 'Seguimiento de tratamientos en curso.', true, NOW(), NOW());

INSERT INTO "FormTemplateField" (
  id, "templateId", label, "fieldType", position, "isRequired", options, "defaultValue"
) VALUES
  ('seed_cm_field_eval_ctro_motivo', 'seed_cm_tpl_eval_ctro', 'Motivo de consulta', 'TEXT', 0, true, NULL, NULL),
  ('seed_cm_field_eval_ctro_dolor', 'seed_cm_tpl_eval_ctro', 'Escala de dolor', 'NUMBER', 1, true, NULL, '3'),
  ('seed_cm_field_eval_ctro_proximo', 'seed_cm_tpl_eval_ctro', 'Proximo control', 'DATE', 2, false, NULL, NULL),
  ('seed_cm_field_eval_ctro_prioridad', 'seed_cm_tpl_eval_ctro', 'Prioridad clinica', 'SELECT', 3, true, 'Baja,Media,Alta', 'Media'),
  ('seed_cm_field_eval_ctro_hallazgos', 'seed_cm_tpl_eval_ctro', 'Hallazgos', 'TEXTAREA', 4, true, NULL, NULL),
  ('seed_cm_field_eval_ctro_ayuno', 'seed_cm_tpl_eval_ctro', 'Ayuno cumplido', 'BOOLEAN', 5, false, NULL, NULL),
  ('seed_cm_field_control_ctro_tratamiento', 'seed_cm_tpl_control_ctro', 'Tratamiento principal', 'TEXT', 0, true, NULL, NULL),
  ('seed_cm_field_control_ctro_piezas', 'seed_cm_tpl_control_ctro', 'Piezas intervenidas', 'TEXT', 1, true, NULL, NULL),
  ('seed_cm_field_control_ctro_sesiones', 'seed_cm_tpl_control_ctro', 'Sesiones restantes', 'NUMBER', 2, true, NULL, '2'),
  ('seed_cm_field_control_ctro_estado', 'seed_cm_tpl_control_ctro', 'Estado del plan', 'SELECT', 3, true, 'Planificado,En curso,Cerrado', 'En curso'),
  ('seed_cm_field_control_ctro_indicaciones', 'seed_cm_tpl_control_ctro', 'Indicaciones', 'TEXTAREA', 4, false, NULL, NULL),
  ('seed_cm_field_control_ctro_imagen', 'seed_cm_tpl_control_ctro', 'Requiere imagenologia', 'BOOLEAN', 5, false, NULL, NULL),
  ('seed_cm_field_eval_nrt_motivo', 'seed_cm_tpl_eval_nrt', 'Motivo de consulta', 'TEXT', 0, true, NULL, NULL),
  ('seed_cm_field_eval_nrt_dolor', 'seed_cm_tpl_eval_nrt', 'Escala de dolor', 'NUMBER', 1, true, NULL, '4'),
  ('seed_cm_field_eval_nrt_proximo', 'seed_cm_tpl_eval_nrt', 'Proximo control', 'DATE', 2, false, NULL, NULL),
  ('seed_cm_field_eval_nrt_prioridad', 'seed_cm_tpl_eval_nrt', 'Prioridad clinica', 'SELECT', 3, true, 'Baja,Media,Alta', 'Media'),
  ('seed_cm_field_eval_nrt_hallazgos', 'seed_cm_tpl_eval_nrt', 'Hallazgos', 'TEXTAREA', 4, true, NULL, NULL),
  ('seed_cm_field_eval_nrt_ayuno', 'seed_cm_tpl_eval_nrt', 'Ayuno cumplido', 'BOOLEAN', 5, false, NULL, NULL),
  ('seed_cm_field_control_nrt_tratamiento', 'seed_cm_tpl_control_nrt', 'Tratamiento principal', 'TEXT', 0, true, NULL, NULL),
  ('seed_cm_field_control_nrt_piezas', 'seed_cm_tpl_control_nrt', 'Piezas intervenidas', 'TEXT', 1, true, NULL, NULL),
  ('seed_cm_field_control_nrt_sesiones', 'seed_cm_tpl_control_nrt', 'Sesiones restantes', 'NUMBER', 2, true, NULL, '3'),
  ('seed_cm_field_control_nrt_estado', 'seed_cm_tpl_control_nrt', 'Estado del plan', 'SELECT', 3, true, 'Planificado,En curso,Cerrado', 'En curso'),
  ('seed_cm_field_control_nrt_indicaciones', 'seed_cm_tpl_control_nrt', 'Indicaciones', 'TEXTAREA', 4, false, NULL, NULL),
  ('seed_cm_field_control_nrt_imagen', 'seed_cm_tpl_control_nrt', 'Requiere imagenologia', 'BOOLEAN', 5, false, NULL, NULL);

INSERT INTO "LeadColumn" (id, "clinicId", name, color, position, "createdAt", "updatedAt") VALUES
  ('seed_cm_col_ctro_nuevo', 'seed_cm_clinic_centro', 'Nuevo Lead', '#818cf8', 0, NOW(), NOW()),
  ('seed_cm_col_ctro_contactado', 'seed_cm_clinic_centro', 'Contactado', '#f59e0b', 1, NOW(), NOW()),
  ('seed_cm_col_ctro_negociacion', 'seed_cm_clinic_centro', 'En Negociacion', '#3b82f6', 2, NOW(), NOW()),
  ('seed_cm_col_ctro_propuesta', 'seed_cm_clinic_centro', 'Propuesta Enviada', '#8b5cf6', 3, NOW(), NOW()),
  ('seed_cm_col_ctro_ganado', 'seed_cm_clinic_centro', 'Ganado', '#10b981', 4, NOW(), NOW()),
  ('seed_cm_col_ctro_perdido', 'seed_cm_clinic_centro', 'Perdido', '#ef4444', 5, NOW(), NOW()),
  ('seed_cm_col_nrt_nuevo', 'seed_cm_clinic_norte', 'Nuevo Lead', '#818cf8', 0, NOW(), NOW()),
  ('seed_cm_col_nrt_contactado', 'seed_cm_clinic_norte', 'Contactado', '#f59e0b', 1, NOW(), NOW()),
  ('seed_cm_col_nrt_negociacion', 'seed_cm_clinic_norte', 'En Negociacion', '#3b82f6', 2, NOW(), NOW()),
  ('seed_cm_col_nrt_propuesta', 'seed_cm_clinic_norte', 'Propuesta Enviada', '#8b5cf6', 3, NOW(), NOW()),
  ('seed_cm_col_nrt_ganado', 'seed_cm_clinic_norte', 'Ganado', '#10b981', 4, NOW(), NOW()),
  ('seed_cm_col_nrt_perdido', 'seed_cm_clinic_norte', 'Perdido', '#ef4444', 5, NOW(), NOW());

-- ============================================================================
-- 2. PACIENTES Y AGENDA COMPLETA DEL MES ACTUAL
-- ============================================================================
CREATE TEMP TABLE seed_cm_schedule (
  clinic_id text,
  clinic_code text,
  doctor_sort int,
  doctor_key text,
  doctor_id text,
  box_id text,
  specialty text,
  created_by text,
  day_rule text
) ON COMMIT DROP;

INSERT INTO seed_cm_schedule (clinic_id, clinic_code, doctor_sort, doctor_key, doctor_id, box_id, specialty, created_by, day_rule) VALUES
  ('seed_cm_clinic_centro', 'ctro', 1, 'general', 'seed_cm_usr_doc_general', 'seed_cm_box_ctro_1', 'Odontologia General', 'seed_cm_usr_sec_centro', 'all'),
  ('seed_cm_clinic_centro', 'ctro', 2, 'ortho', 'seed_cm_usr_doc_ortho', 'seed_cm_box_ctro_2', 'Ortodoncia', 'seed_cm_usr_sec_centro', 'all'),
  ('seed_cm_clinic_centro', 'ctro', 3, 'multi', 'seed_cm_usr_doc_multi', 'seed_cm_box_ctro_3', 'Periodoncia', 'seed_cm_usr_admin', 'odd'),
  ('seed_cm_clinic_norte', 'nrt', 1, 'endo', 'seed_cm_usr_doc_endo', 'seed_cm_box_nrt_1', 'Endodoncia', 'seed_cm_usr_sec_norte', 'all'),
  ('seed_cm_clinic_norte', 'nrt', 2, 'implants', 'seed_cm_usr_doc_implants', 'seed_cm_box_nrt_2', 'Implantologia', 'seed_cm_usr_sec_norte', 'all'),
  ('seed_cm_clinic_norte', 'nrt', 3, 'multi', 'seed_cm_usr_doc_multi', 'seed_cm_box_nrt_3', 'Periodoncia', 'seed_cm_usr_admin_ops', 'even');

CREATE TEMP TABLE seed_cm_patient_pool ON COMMIT DROP AS
WITH params AS (
  SELECT
    date_trunc('month', CURRENT_DATE)::date AS month_start,
    (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date AS month_end,
    ((date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date - date_trunc('month', CURRENT_DATE)::date) AS days_in_month
),
clinics AS (
  SELECT * FROM (VALUES
    ('seed_cm_clinic_centro', 'ctro', 'Santiago'),
    ('seed_cm_clinic_norte', 'nrt', 'Antofagasta')
  ) AS c(clinic_id, clinic_code, city)
),
dict AS (
  SELECT
    ARRAY['Martina','Sofia','Mateo','Valentina','Emilia','Benjamin','Julieta','Vicente','Maite','Gaspar','Antonia','Ignacio','Florencia','Lucas','Amanda','Raimundo','Trinidad','Alonso','Josefa','Bastian','Catalina','Maximiliano','Fernanda','Martin']::text[] AS first_names,
    ARRAY['Perez','Soto','Rojas','Gonzalez','Navarro','Contreras','Araya','Mendez','Silva','Torres','Campos','Reyes','Fuentes','Vera','Morales','Valdes','Sepulveda','Ramirez','Castillo','Nunez','Jorquera','Salazar','Vargas','Olivares']::text[] AS last_names
),
generated AS (
  SELECT
    c.clinic_id,
    c.clinic_code,
    c.city,
    gs AS patient_slot,
    format('seed_cm_pat_%s_%s', c.clinic_code, lpad(gs::text, 2, '0')) AS patient_id,
    d.first_names[((gs + CASE WHEN c.clinic_code = 'ctro' THEN 0 ELSE 7 END - 1) % 24) + 1] AS first_name,
    d.last_names[((gs + CASE WHEN c.clinic_code = 'ctro' THEN 3 ELSE 11 END - 1) % 24) + 1] AS last_name,
    CASE
      WHEN gs % 4 = 0 THEN NULL
      ELSE d.last_names[((gs + CASE WHEN c.clinic_code = 'ctro' THEN 9 ELSE 2 END - 1) % 24) + 1]
    END AS second_last_name,
    LPAD((CASE WHEN c.clinic_code = 'ctro' THEN 31000000 ELSE 42000000 END + gs)::text, 8, '0') AS run_body,
    ((gs + CASE WHEN c.clinic_code = 'ctro' THEN 1 ELSE 4 END) % 9) + 1 AS verifier,
    CASE WHEN gs % 2 = 0 THEN 'female' ELSE 'male' END AS gender,
    CASE
      WHEN gs <= 18 THEN
        (p.month_start::timestamp + (((gs * 2) + CASE WHEN c.clinic_code = 'ctro' THEN 0 ELSE 3 END) % p.days_in_month) * INTERVAL '1 day' + INTERVAL '09:00')
      ELSE
        (p.month_start::timestamp - ((gs - 18) * INTERVAL '4 day') + INTERVAL '10:15')
    END AS created_at
  FROM clinics c
  CROSS JOIN params p
  CROSS JOIN dict d
  CROSS JOIN generate_series(1, 24) AS gs
)
SELECT
  clinic_id,
  clinic_code,
  city,
  patient_slot,
  patient_id,
  first_name,
  last_name,
  second_last_name,
  format('%s.%s.%s-%s', substr(run_body, 1, 2), substr(run_body, 3, 3), substr(run_body, 6, 3), verifier) AS run,
  run_body || verifier::text AS run_normalized,
  lower(
    regexp_replace(first_name || '.' || last_name || '.' || clinic_code || '.' || lpad(patient_slot::text, 2, '0'), '[^a-zA-Z0-9\.]', '', 'g')
  ) || '@seed.medigest.test' AS email,
  format('+5697%s', lpad((patient_slot * 431 + CASE WHEN clinic_code = 'ctro' THEN 110 ELSE 420 END)::text, 7, '0')) AS phone,
  ((CURRENT_DATE - make_interval(years => 18 + (patient_slot % 37), months => patient_slot % 12))::date)::timestamp AS birth_date,
  gender,
  format('Av. %s %s', CASE WHEN clinic_code = 'ctro' THEN 'Providencia' ELSE 'Brasil' END, 100 + patient_slot * 7) AS address,
  format('Contacto %s %s', first_name, last_name) AS emergency_contact_name,
  format('+5698%s', lpad((patient_slot * 379 + CASE WHEN clinic_code = 'ctro' THEN 215 ELSE 517 END)::text, 7, '0')) AS emergency_contact_phone,
  (patient_slot <> 24) AS is_active,
  created_at
FROM generated;

INSERT INTO "Patient" (
  id, "clinicId", "firstName", "lastName", "secondLastName", run, "runNormalized",
  email, phone, "birthDate", gender, address, city, "emergencyContactName",
  "emergencyContactPhone", "isActive", "createdAt", "updatedAt"
)
SELECT
  patient_id,
  clinic_id,
  first_name,
  last_name,
  second_last_name,
  run,
  run_normalized,
  email,
  phone,
  birth_date,
  gender,
  address,
  city,
  emergency_contact_name,
  emergency_contact_phone,
  is_active,
  created_at,
  GREATEST(created_at, NOW() - INTERVAL '1 hour')
FROM seed_cm_patient_pool;

CREATE TEMP TABLE seed_cm_generated_appointments ON COMMIT DROP AS
WITH params AS (
  SELECT
    date_trunc('month', CURRENT_DATE)::date AS month_start,
    (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date AS month_end
),
slot_seed AS (
  SELECT * FROM (VALUES
    ('weekday', 1, TIME '08:30', 50),
    ('weekday', 2, TIME '10:00', 50),
    ('weekday', 3, TIME '11:30', 50),
    ('weekday', 4, TIME '14:30', 60),
    ('weekday', 5, TIME '16:00', 40),
    ('saturday', 1, TIME '09:00', 60),
    ('saturday', 2, TIME '10:30', 60),
    ('saturday', 3, TIME '12:00', 45),
    ('sunday', 1, TIME '10:00', 40),
    ('sunday', 2, TIME '11:00', 40)
  ) AS s(slot_kind, slot_order, slot_time, duration_minutes)
),
days AS (
  SELECT generate_series(p.month_start, p.month_end - INTERVAL '1 day', INTERVAL '1 day')::date AS calendar_day
  FROM params p
),
candidates AS (
  SELECT
    sc.clinic_id,
    sc.clinic_code,
    sc.doctor_sort,
    sc.doctor_key,
    sc.doctor_id,
    sc.box_id,
    sc.specialty,
    sc.created_by,
    d.calendar_day,
    ss.slot_order,
    ss.slot_time,
    ss.duration_minutes,
    row_number() OVER (
      PARTITION BY sc.clinic_id
      ORDER BY d.calendar_day, sc.doctor_sort, ss.slot_order
    ) AS clinic_seq
  FROM days d
  JOIN seed_cm_schedule sc
    ON (
      sc.day_rule = 'all'
      OR (sc.day_rule = 'odd' AND EXTRACT(day FROM d.calendar_day)::int % 2 = 1)
      OR (sc.day_rule = 'even' AND EXTRACT(day FROM d.calendar_day)::int % 2 = 0)
    )
  JOIN slot_seed ss
    ON ss.slot_kind = CASE
      WHEN EXTRACT(ISODOW FROM d.calendar_day)::int = 6 THEN 'saturday'
      WHEN EXTRACT(ISODOW FROM d.calendar_day)::int = 7 THEN 'sunday'
      ELSE 'weekday'
    END
  WHERE NOT (EXTRACT(ISODOW FROM d.calendar_day)::int = 7 AND sc.doctor_sort > 1)
),
base AS (
  SELECT
    format('seed_cm_appt_%s_%s_%s_%s', clinic_code, doctor_key, to_char(calendar_day, 'DD'), slot_order) AS appointment_id,
    clinic_id,
    clinic_code,
    doctor_id,
    box_id,
    specialty,
    created_by,
    calendar_day,
    slot_order,
    clinic_seq,
    (calendar_day::timestamp + slot_time) AS start_at,
    (calendar_day::timestamp + slot_time + make_interval(mins => duration_minutes)) AS end_at,
    CASE
      WHEN calendar_day < CURRENT_DATE THEN
        CASE
          WHEN slot_order = 5 AND EXTRACT(day FROM calendar_day)::int % 4 = 0 THEN 'CANCELLED'
          WHEN slot_order = 4 AND EXTRACT(day FROM calendar_day)::int % 3 = 0 THEN 'NO_SHOW'
          ELSE 'COMPLETED'
        END
      WHEN calendar_day = CURRENT_DATE THEN
        CASE
          WHEN slot_order = 1 THEN 'COMPLETED'
          WHEN slot_order IN (2, 4) THEN 'CONFIRMED'
          ELSE 'SCHEDULED'
        END
      ELSE
        CASE WHEN slot_order IN (2, 4) THEN 'CONFIRMED' ELSE 'SCHEDULED' END
    END AS status_text
  FROM candidates
)
SELECT
  b.appointment_id,
  b.clinic_id,
  b.clinic_code,
  pp.patient_id,
  b.doctor_id,
  b.box_id,
  b.specialty,
  b.created_by,
  b.calendar_day,
  b.slot_order,
  b.start_at,
  b.end_at,
  b.status_text,
  CASE
    WHEN b.status_text = 'CANCELLED' THEN 'WAIVED'
    WHEN b.status_text = 'NO_SHOW' THEN 'PENDING'
    WHEN b.status_text = 'COMPLETED' AND b.slot_order = 3 AND EXTRACT(day FROM b.calendar_day)::int % 5 = 0 THEN 'WAIVED'
    WHEN b.status_text = 'COMPLETED' AND b.slot_order % 4 = 0 THEN 'PENDING'
    WHEN b.status_text = 'COMPLETED' THEN 'PAID'
    ELSE 'PENDING'
  END AS payment_status_text,
  CASE
    WHEN b.specialty = 'Ortodoncia' THEN 'Control de alineacion y ajuste del arco.'
    WHEN b.specialty = 'Endodoncia' THEN 'Revision de dolor, sensibilidad y sellado.'
    WHEN b.specialty = 'Implantologia' THEN 'Chequeo de cicatrizacion y estabilidad del implante.'
    WHEN b.specialty = 'Periodoncia' THEN 'Mantencion periodontal y seguimiento de bolsas.'
    ELSE 'Evaluacion general, higiene y plan preventivo.'
  END AS notes,
  (b.start_at - CASE WHEN b.calendar_day < CURRENT_DATE THEN INTERVAL '7 days' ELSE INTERVAL '3 days' END + make_interval(mins => b.slot_order * 7)) AS created_at,
  GREATEST(
    (b.start_at - CASE WHEN b.calendar_day < CURRENT_DATE THEN INTERVAL '1 day' ELSE INTERVAL '20 minutes' END),
    (b.start_at - INTERVAL '12 hours')
  ) AS updated_at
FROM base b
JOIN seed_cm_patient_pool pp
  ON pp.clinic_id = b.clinic_id
 AND pp.patient_slot = ((b.clinic_seq - 1) % 24) + 1;

INSERT INTO "Appointment" (
  id, "clinicId", "patientId", "doctorId", "boxId", "startAt", "endAt",
  status, "paymentStatus", notes, "createdBy", "createdAt", "updatedAt"
)
SELECT
  appointment_id,
  clinic_id,
  patient_id,
  doctor_id,
  box_id,
  start_at,
  end_at,
  status_text::"AppointmentStatus",
  payment_status_text::"PaymentStatus",
  notes,
  created_by,
  created_at,
  updated_at
FROM seed_cm_generated_appointments;

CREATE TEMP TABLE seed_cm_completed_care ON COMMIT DROP AS
SELECT
  replace(appointment_id, 'seed_cm_appt_', 'seed_cm_visit_') AS visit_id,
  replace(appointment_id, 'seed_cm_appt_', 'seed_cm_pt_') AS patient_treatment_id,
  replace(appointment_id, 'seed_cm_appt_', 'seed_cm_pay_') AS payment_id,
  replace(appointment_id, 'seed_cm_appt_', 'seed_cm_record_') AS record_id,
  appointment_id,
  clinic_id,
  clinic_code,
  patient_id,
  doctor_id,
  specialty,
  slot_order,
  start_at,
  end_at,
  created_at,
  updated_at,
  payment_status_text,
  CASE
    WHEN specialty = 'Ortodoncia' THEN CASE WHEN slot_order % 2 = 0 THEN 'seed_cm_trt_brackets' ELSE 'seed_cm_trt_ortho_control' END
    WHEN specialty = 'Endodoncia' THEN 'seed_cm_trt_endodoncia'
    WHEN specialty = 'Implantologia' THEN CASE WHEN slot_order % 2 = 0 THEN 'seed_cm_trt_implante' ELSE 'seed_cm_trt_cirugia' END
    WHEN specialty = 'Periodoncia' THEN 'seed_cm_trt_perio'
    ELSE CASE WHEN slot_order IN (1, 2) THEN 'seed_cm_trt_eval' WHEN slot_order = 3 THEN 'seed_cm_trt_profilaxis' ELSE 'seed_cm_trt_urgencia' END
  END AS treatment_id,
  CASE
    WHEN specialty IN ('Ortodoncia', 'Endodoncia', 'Implantologia') THEN format('seed_cm_tpl_control_%s', clinic_code)
    ELSE format('seed_cm_tpl_eval_%s', clinic_code)
  END AS template_id
FROM seed_cm_generated_appointments
WHERE status_text = 'COMPLETED';

INSERT INTO "ClinicalVisit" (
  id, "clinicId", "patientId", "doctorId", "appointmentId", "startedAt", "createdAt"
)
SELECT
  visit_id,
  clinic_id,
  patient_id,
  doctor_id,
  appointment_id,
  start_at + INTERVAL '5 minutes',
  created_at
FROM seed_cm_completed_care;

INSERT INTO "PatientTreatment" (
  id, "patientId", "treatmentId", "performedAt", "createdAt", "updatedAt"
)
SELECT
  patient_treatment_id,
  patient_id,
  treatment_id,
  start_at + INTERVAL '25 minutes',
  created_at,
  updated_at
FROM seed_cm_completed_care;

INSERT INTO "PaymentHistory" (
  id, "patientTreatmentId", "recordedAt", status, amount, notes, "createdAt", "updatedAt"
)
SELECT
  c.payment_id,
  c.patient_treatment_id,
  c.start_at + INTERVAL '40 minutes',
  c.payment_status_text::"PaymentStatus",
  CASE
    WHEN c.payment_status_text = 'WAIVED' THEN 0
    ELSE t.price
  END,
  CASE
    WHEN c.payment_status_text = 'PENDING' THEN 'Pago pendiente de confirmacion en caja.'
    WHEN c.payment_status_text = 'WAIVED' THEN 'Cobro exento por seguimiento o garantia.'
    ELSE 'Pago registrado el mismo dia de la atencion.'
  END,
  c.created_at,
  c.updated_at
FROM seed_cm_completed_care c
JOIN "Treatment" t ON t.id = c.treatment_id;

INSERT INTO "Observation" (
  id, "clinicId", "patientId", "doctorId", "clinicalVisitId",
  status, code, "codeSystem", "codeDisplay", "categoryCode", "categorySystem",
  "categoryDisplay", "valueType", "valueString", "valueQuantity",
  "valueBoolean", "valueUnit", "effectiveAt", "issuedAt", notes, "createdAt", "updatedAt"
)
SELECT
  replace(visit_id, 'seed_cm_visit_', 'seed_cm_obs_temp_'),
  clinic_id,
  patient_id,
  doctor_id,
  visit_id,
  'FINAL'::"ObservationStatus",
  '8310-5',
  'http://loinc.org',
  'Temperatura corporal',
  'vital-signs',
  'http://terminology.hl7.org/CodeSystem/observation-category',
  'Signos vitales',
  'QUANTITY'::"ObservationValueType",
  NULL::text,
  36.2 + ((EXTRACT(day FROM start_at)::int + slot_order) % 7) * 0.1,
  NULL::boolean,
  '°C',
  start_at + INTERVAL '10 minutes',
  start_at + INTERVAL '12 minutes',
  NULL::text,
  created_at,
  updated_at
FROM seed_cm_completed_care
UNION ALL
SELECT
  replace(visit_id, 'seed_cm_visit_', 'seed_cm_obs_note_'),
  clinic_id,
  patient_id,
  doctor_id,
  visit_id,
  CASE WHEN slot_order = 5 THEN 'PRELIMINARY'::"ObservationStatus" ELSE 'FINAL'::"ObservationStatus" END,
  CASE
    WHEN specialty = 'Ortodoncia' THEN 'ortho-control'
    WHEN specialty = 'Endodoncia' THEN 'endo-followup'
    WHEN specialty = 'Implantologia' THEN 'implant-check'
    WHEN specialty = 'Periodoncia' THEN 'perio-maintenance'
    ELSE 'general-check'
  END,
  'http://medigest.test/codes',
  'Resumen de atencion',
  'exam',
  'http://terminology.hl7.org/CodeSystem/observation-category',
  'Examen',
  'STRING'::"ObservationValueType",
  CASE
    WHEN specialty = 'Ortodoncia' THEN 'Ajuste de aparatologia sin incidencias. Se refuerza uso elastico y control en cuatro semanas.'
    WHEN specialty = 'Endodoncia' THEN 'Disminucion del dolor y respuesta favorable a pruebas de percusion.'
    WHEN specialty = 'Implantologia' THEN 'Cicatrizacion estable. Se mantiene plan y cuidados postoperatorios.'
    WHEN specialty = 'Periodoncia' THEN 'Menor sangrado al sondaje y mejoria de higiene interdental.'
    ELSE 'Control general estable, sin urgencias. Se mantiene plan preventivo.'
  END,
  NULL::double precision,
  NULL::boolean,
  NULL::text,
  start_at + INTERVAL '15 minutes',
  start_at + INTERVAL '18 minutes',
  'Observacion generada por seed mensual.',
  created_at,
  updated_at
FROM seed_cm_completed_care
UNION ALL
SELECT
  replace(visit_id, 'seed_cm_visit_', 'seed_cm_obs_risk_'),
  clinic_id,
  patient_id,
  doctor_id,
  visit_id,
  CASE WHEN slot_order = 2 AND EXTRACT(day FROM start_at)::int % 6 = 0 THEN 'AMENDED'::"ObservationStatus" ELSE 'FINAL'::"ObservationStatus" END,
  'bleeding-risk',
  'http://medigest.test/codes',
  'Riesgo de sangrado',
  'social-history',
  'http://terminology.hl7.org/CodeSystem/observation-category',
  'Antecedentes',
  'BOOLEAN'::"ObservationValueType",
  NULL::text,
  NULL::double precision,
  (slot_order + EXTRACT(day FROM start_at)::int) % 2 = 0,
  NULL::text,
  start_at + INTERVAL '22 minutes',
  start_at + INTERVAL '23 minutes',
  'Dato booleano para probar observaciones de tipo si/no.',
  created_at,
  updated_at
FROM seed_cm_completed_care
WHERE (slot_order + EXTRACT(day FROM start_at)::int) % 3 = 0;

INSERT INTO "ClinicalRecord" (
  id, "clinicId", "appointmentId", "templateId", "patientId", "doctorId", "createdAt", "updatedAt"
)
SELECT
  record_id,
  clinic_id,
  appointment_id,
  template_id,
  patient_id,
  doctor_id,
  created_at,
  updated_at
FROM seed_cm_completed_care;

INSERT INTO "ClinicalRecordValue" (id, "clinicalRecordId", "fieldId", value)
SELECT
  record_id || '_motivo',
  record_id,
  replace(template_id, 'seed_cm_tpl_', 'seed_cm_field_') || '_motivo',
  CASE
    WHEN specialty = 'Periodoncia' THEN 'Control periodontal mensual'
    WHEN specialty = 'Odontologia General' THEN 'Chequeo preventivo y evaluacion'
    ELSE 'Consulta derivada de seguimiento'
  END
FROM seed_cm_completed_care
WHERE template_id LIKE 'seed_cm_tpl_eval_%'
UNION ALL
SELECT
  record_id || '_dolor',
  record_id,
  replace(template_id, 'seed_cm_tpl_', 'seed_cm_field_') || '_dolor',
  (((slot_order + EXTRACT(day FROM start_at)::int) % 7) + 1)::text
FROM seed_cm_completed_care
WHERE template_id LIKE 'seed_cm_tpl_eval_%'
UNION ALL
SELECT
  record_id || '_proximo',
  record_id,
  replace(template_id, 'seed_cm_tpl_', 'seed_cm_field_') || '_proximo',
  to_char((start_at::date + INTERVAL '21 days')::date, 'YYYY-MM-DD')
FROM seed_cm_completed_care
WHERE template_id LIKE 'seed_cm_tpl_eval_%'
UNION ALL
SELECT
  record_id || '_prioridad',
  record_id,
  replace(template_id, 'seed_cm_tpl_', 'seed_cm_field_') || '_prioridad',
  CASE
    WHEN slot_order IN (4, 5) THEN 'Alta'
    WHEN slot_order = 3 THEN 'Media'
    ELSE 'Baja'
  END
FROM seed_cm_completed_care
WHERE template_id LIKE 'seed_cm_tpl_eval_%'
UNION ALL
SELECT
  record_id || '_hallazgos',
  record_id,
  replace(template_id, 'seed_cm_tpl_', 'seed_cm_field_') || '_hallazgos',
  CASE
    WHEN specialty = 'Periodoncia' THEN 'Inflamacion gingival controlada. Se insiste en higiene interdental y mantencion.'
    ELSE 'Piezas sin caries activas. Se deja plan de seguimiento y refuerzo de higiene.'
  END
FROM seed_cm_completed_care
WHERE template_id LIKE 'seed_cm_tpl_eval_%'
UNION ALL
SELECT
  record_id || '_ayuno',
  record_id,
  replace(template_id, 'seed_cm_tpl_', 'seed_cm_field_') || '_ayuno',
  CASE WHEN EXTRACT(day FROM start_at)::int % 2 = 0 THEN 'true' ELSE 'false' END
FROM seed_cm_completed_care
WHERE template_id LIKE 'seed_cm_tpl_eval_%'
UNION ALL
SELECT
  record_id || '_tratamiento',
  record_id,
  replace(template_id, 'seed_cm_tpl_', 'seed_cm_field_') || '_tratamiento',
  CASE
    WHEN specialty = 'Ortodoncia' THEN 'Ajuste ortodontico'
    WHEN specialty = 'Endodoncia' THEN 'Control endodontico'
    ELSE 'Control implantologico'
  END
FROM seed_cm_completed_care
WHERE template_id LIKE 'seed_cm_tpl_control_%'
UNION ALL
SELECT
  record_id || '_piezas',
  record_id,
  replace(template_id, 'seed_cm_tpl_', 'seed_cm_field_') || '_piezas',
  CASE
    WHEN specialty = 'Ortodoncia' THEN '1.1 / 2.1'
    WHEN specialty = 'Endodoncia' THEN '3.6'
    ELSE '1.6'
  END
FROM seed_cm_completed_care
WHERE template_id LIKE 'seed_cm_tpl_control_%'
UNION ALL
SELECT
  record_id || '_sesiones',
  record_id,
  replace(template_id, 'seed_cm_tpl_', 'seed_cm_field_') || '_sesiones',
  GREATEST(1, 5 - slot_order)::text
FROM seed_cm_completed_care
WHERE template_id LIKE 'seed_cm_tpl_control_%'
UNION ALL
SELECT
  record_id || '_estado',
  record_id,
  replace(template_id, 'seed_cm_tpl_', 'seed_cm_field_') || '_estado',
  CASE WHEN slot_order IN (4, 5) THEN 'Cerrado' ELSE 'En curso' END
FROM seed_cm_completed_care
WHERE template_id LIKE 'seed_cm_tpl_control_%'
UNION ALL
SELECT
  record_id || '_indicaciones',
  record_id,
  replace(template_id, 'seed_cm_tpl_', 'seed_cm_field_') || '_indicaciones',
  CASE
    WHEN specialty = 'Ortodoncia' THEN 'Uso estricto de elasticos y control en cuatro semanas.'
    WHEN specialty = 'Endodoncia' THEN 'Vigilar dolor, evitar carga y controlar si reaparece sensibilidad.'
    ELSE 'Mantener antisepsia local y revisar estabilidad en proximo control.'
  END
FROM seed_cm_completed_care
WHERE template_id LIKE 'seed_cm_tpl_control_%'
UNION ALL
SELECT
  record_id || '_imagen',
  record_id,
  replace(template_id, 'seed_cm_tpl_', 'seed_cm_field_') || '_imagen',
  CASE WHEN slot_order % 2 = 0 THEN 'true' ELSE 'false' END
FROM seed_cm_completed_care
WHERE template_id LIKE 'seed_cm_tpl_control_%';

-- ============================================================================
-- 3. CRM, ALERTAS, FHIR Y AUDITORIA
-- ============================================================================
CREATE TEMP TABLE seed_cm_generated_leads ON COMMIT DROP AS
WITH params AS (
  SELECT
    date_trunc('month', CURRENT_DATE)::date AS month_start,
    ((date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date - date_trunc('month', CURRENT_DATE)::date) AS days_in_month
),
clinics AS (
  SELECT * FROM (VALUES
    ('seed_cm_clinic_centro', 'ctro'),
    ('seed_cm_clinic_norte', 'nrt')
  ) AS c(clinic_id, clinic_code)
),
generated AS (
  SELECT
    c.clinic_id,
    c.clinic_code,
    gs AS lead_slot,
    format('seed_cm_lead_%s_%s', c.clinic_code, lpad(gs::text, 2, '0')) AS lead_id,
    format(
      '%s %s',
      (ARRAY['Amanda','Joaquin','Rafaela','Nicolas','Milagros','Cristobal','Agustina','Benjamin','Elena','Felipe','Teresa','Pablo','Manuela','Diego','Elisa','Santiago','Renata','Bruno'])[(gs - 1) % 18 + 1],
      (ARRAY['Salinas','Molina','Tapia','Becerra','Leal','Pavez','Yanez','Abarca','Lagos','Henriquez','Asenjo','Bustos','Caceres','Escobar','Farias','Gallardo','Navarrete','Pezoa'])[(gs + CASE WHEN c.clinic_code = 'ctro' THEN 2 ELSE 7 END - 1) % 18 + 1]
    ) AS lead_name,
    (ARRAY['Dental Plus','Sonrisa Urbana','Clinica Norte','Oral Lab','Bright Care','Nexo Salud','Agenda Digital','Boca Feliz'])[(gs + CASE WHEN c.clinic_code = 'ctro' THEN 1 ELSE 4 END - 1) % 8 + 1] AS company_name,
    (ARRAY['instagram','whatsapp','facebook','tiktok','email','phone','website','referral'])[(gs - 1) % 8 + 1] AS channel_name,
    (ARRAY['retail','salud','educacion','industrial','tecnologia','mineria','servicios','publico'])[(gs + CASE WHEN c.clinic_code = 'ctro' THEN 2 ELSE 5 END - 1) % 8 + 1] AS sector_name,
    (ARRAY['low','medium','high','urgent'])[(gs - 1) % 4 + 1] AS priority_name,
    (ARRAY['Implantes','Ortodoncia','Urgencias','Periodoncia','Evaluacion','Control'])[(gs - 1) % 6 + 1] AS primary_tag,
    (p.month_start::timestamp + (((gs * 2) + CASE WHEN c.clinic_code = 'ctro' THEN 1 ELSE 4 END) % p.days_in_month) * INTERVAL '1 day' + INTERVAL '11:00') AS created_at
  FROM clinics c
  CROSS JOIN params p
  CROSS JOIN generate_series(1, 18) AS gs
)
SELECT
  g.*,
  CASE
    WHEN lead_slot <= 4 THEN format('seed_cm_col_%s_nuevo', clinic_code)
    WHEN lead_slot <= 7 THEN format('seed_cm_col_%s_contactado', clinic_code)
    WHEN lead_slot <= 10 THEN format('seed_cm_col_%s_negociacion', clinic_code)
    WHEN lead_slot <= 13 THEN format('seed_cm_col_%s_propuesta', clinic_code)
    WHEN lead_slot <= 15 THEN format('seed_cm_col_%s_ganado', clinic_code)
    ELSE format('seed_cm_col_%s_perdido', clinic_code)
  END AS column_id,
  format('+5696%s', lpad((lead_slot * 557 + CASE WHEN clinic_code = 'ctro' THEN 105 ELSE 405 END)::text, 7, '0')) AS phone,
  lower(regexp_replace(replace(lead_name, ' ', '.') || '.' || clinic_code, '[^a-zA-Z0-9\.]', '', 'g')) || '@seed.medigest.test' AS email,
  CASE
    WHEN clinic_code = 'ctro' THEN CASE WHEN lead_slot % 3 = 1 THEN 'seed_cm_usr_doc_general' WHEN lead_slot % 3 = 2 THEN 'seed_cm_usr_doc_ortho' ELSE 'seed_cm_usr_doc_multi' END
    ELSE CASE WHEN lead_slot % 3 = 1 THEN 'seed_cm_usr_doc_endo' WHEN lead_slot % 3 = 2 THEN 'seed_cm_usr_doc_implants' ELSE 'seed_cm_usr_doc_multi' END
  END AS assigned_doctor_id,
  CASE
    WHEN lead_slot IN (14, 15) THEN format('seed_cm_pat_%s_%s', clinic_code, lpad((((lead_slot * 2) - 1) % 24 + 1)::text, 2, '0'))
    ELSE NULL
  END AS converted_patient_id,
  CASE
    WHEN lead_slot IN (14, 15, 18) THEN NULL
    ELSE (created_at::date + ((lead_slot % 6) - 2) * INTERVAL '1 day')::timestamp
  END AS follow_up_date,
  (lead_slot = 18) AS archived_flag,
  (lead_slot IN (14, 15)) AS converted_flag,
  created_at + ((lead_slot % 4) + 1) * INTERVAL '1 day' AS updated_at
FROM generated g;

INSERT INTO "CrmLead" (
  id, "clinicId", "columnId", name, company, channel, phone, email, sector,
  priority, "estimatedBudget", "mainNote", tags, "scrapedData", archived,
  converted, "convertedPatientId", "followUpDate", "assignedDoctorId", "createdAt", "updatedAt"
)
SELECT
  lead_id,
  clinic_id,
  column_id,
  lead_name,
  company_name,
  channel_name,
  phone,
  email,
  sector_name,
  priority_name,
  CASE priority_name WHEN 'urgent' THEN 1850000 WHEN 'high' THEN 980000 WHEN 'medium' THEN 430000 ELSE 180000 END,
  format('Lead captado por %s. Solicita respuesta rapida y agendamiento comercial.', channel_name),
  jsonb_build_array(primary_tag, CASE WHEN priority_name IN ('high', 'urgent') THEN 'alto-ticket' ELSE 'seguimiento' END),
  jsonb_build_object('campaign', 'Abril Seed', 'origin', channel_name, 'score', priority_name, 'clinic', clinic_code),
  archived_flag,
  converted_flag,
  converted_patient_id,
  follow_up_date,
  assigned_doctor_id,
  created_at,
  updated_at
FROM seed_cm_generated_leads;

INSERT INTO "CrmLeadNote" (id, "leadId", text, "createdAt")
SELECT
  lead_id || '_note_01',
  lead_id,
  format('Primer acercamiento comercial desde %s.', channel_name),
  created_at + INTERVAL '2 hours'
FROM seed_cm_generated_leads
UNION ALL
SELECT
  lead_id || '_note_02',
  lead_id,
  'Solicita evaluacion, presupuesto y medios de pago.',
  created_at + INTERVAL '1 day'
FROM seed_cm_generated_leads
WHERE lead_slot % 2 = 0;

INSERT INTO "CrmLeadMessage" (
  id, "leadId", text, direction, channel, "attachmentUrl", "attachmentName", "createdAt"
)
SELECT
  lead_id || '_msg_01',
  lead_id,
  'Hola, vengo por una consulta y necesito disponibilidad esta semana.',
  'inbound',
  channel_name,
  NULL,
  NULL,
  created_at + INTERVAL '1 hour'
FROM seed_cm_generated_leads
UNION ALL
SELECT
  lead_id || '_msg_02',
  lead_id,
  'Te compartimos horarios disponibles y valores referenciales.',
  'outbound',
  channel_name,
  CASE WHEN lead_slot % 3 = 0 THEN 'https://example.com/presupuesto.pdf' ELSE NULL END,
  CASE WHEN lead_slot % 3 = 0 THEN 'presupuesto-seed.pdf' ELSE NULL END,
  created_at + INTERVAL '1 day' + INTERVAL '20 minutes'
FROM seed_cm_generated_leads;

INSERT INTO "CrmLeadActivity" (
  id, "leadId", type, "fromValue", "toValue", "userId", "userName", "createdAt"
)
SELECT
  lead_id || '_activity_created',
  lead_id,
  'created',
  NULL,
  'Nuevo Lead',
  NULL,
  CASE WHEN clinic_code = 'ctro' THEN 'Camila Secretaria Centro' ELSE 'Josefa Secretaria Norte' END,
  created_at
FROM seed_cm_generated_leads
UNION ALL
SELECT
  lead_id || '_activity_moved',
  lead_id,
  'moved',
  'Nuevo Lead',
  CASE
    WHEN lead_slot <= 4 THEN 'Nuevo Lead'
    WHEN lead_slot <= 7 THEN 'Contactado'
    WHEN lead_slot <= 10 THEN 'En Negociacion'
    WHEN lead_slot <= 13 THEN 'Propuesta Enviada'
    WHEN lead_slot <= 15 THEN 'Ganado'
    ELSE 'Perdido'
  END,
  NULL,
  CASE WHEN clinic_code = 'ctro' THEN 'Paula Admin Seed' ELSE 'Matias Operaciones Seed' END,
  created_at + INTERVAL '2 days'
FROM seed_cm_generated_leads
WHERE lead_slot > 4
UNION ALL
SELECT
  lead_id || '_activity_converted',
  lead_id,
  'converted',
  NULL,
  'Paciente ' || converted_patient_id,
  NULL,
  CASE WHEN clinic_code = 'ctro' THEN 'Paula Admin Seed' ELSE 'Matias Operaciones Seed' END,
  updated_at
FROM seed_cm_generated_leads
WHERE converted_flag
UNION ALL
SELECT
  lead_id || '_activity_archived',
  lead_id,
  'archived',
  NULL,
  NULL,
  NULL,
  CASE WHEN clinic_code = 'ctro' THEN 'Paula Admin Seed' ELSE 'Matias Operaciones Seed' END,
  updated_at
FROM seed_cm_generated_leads
WHERE archived_flag;

INSERT INTO "InternalAlert" (
  id, "clinicId", "createdById", "doctorId", "eventType", title, message,
  "referenceType", "referenceId", "createdAt", "updatedAt"
)
WITH future_appts AS (
  SELECT
    ga.*,
    p."firstName" || ' ' || p."lastName" AS patient_name,
    row_number() OVER (PARTITION BY ga.clinic_id ORDER BY ga.start_at) AS rn
  FROM seed_cm_generated_appointments ga
  JOIN "Patient" p ON p.id = ga.patient_id
  WHERE ga.calendar_day >= CURRENT_DATE AND ga.status_text IN ('SCHEDULED', 'CONFIRMED')
),
cancelled_appts AS (
  SELECT
    ga.*,
    p."firstName" || ' ' || p."lastName" AS patient_name,
    row_number() OVER (PARTITION BY ga.clinic_id ORDER BY ga.start_at DESC) AS rn
  FROM seed_cm_generated_appointments ga
  JOIN "Patient" p ON p.id = ga.patient_id
  WHERE ga.status_text = 'CANCELLED'
),
pending_appts AS (
  SELECT
    ga.*,
    p."firstName" || ' ' || p."lastName" AS patient_name,
    row_number() OVER (PARTITION BY ga.clinic_id ORDER BY ga.start_at DESC) AS rn
  FROM seed_cm_generated_appointments ga
  JOIN "Patient" p ON p.id = ga.patient_id
  WHERE ga.payment_status_text = 'PENDING' AND ga.status_text IN ('COMPLETED', 'NO_SHOW')
),
conflict_basis AS (
  SELECT
    ga.*,
    row_number() OVER (PARTITION BY ga.clinic_id ORDER BY ga.start_at) AS rn
  FROM seed_cm_generated_appointments ga
  WHERE ga.calendar_day = CURRENT_DATE
)
SELECT
  format('seed_cm_alert_created_%s_%s', clinic_code, lpad(rn::text, 2, '0')),
  clinic_id,
  created_by,
  doctor_id,
  'APPOINTMENT_CREATED'::"InternalAlertType",
  'Nueva cita agendada',
  format('Se agendo a %s para %s a las %s.', patient_name, to_char(start_at, 'DD/MM'), to_char(start_at, 'HH24:MI')),
  'APPOINTMENT',
  appointment_id,
  NOW() - make_interval(hours => rn::int),
  NOW() - make_interval(hours => rn::int)
FROM future_appts
WHERE rn <= 3
UNION ALL
SELECT
  format('seed_cm_alert_cancel_%s_%s', clinic_code, lpad(rn::text, 2, '0')),
  clinic_id,
  created_by,
  doctor_id,
  'APPOINTMENT_CANCELLED'::"InternalAlertType",
  'Cita cancelada',
  format('Se libero el horario de %s por cancelacion del paciente.', patient_name),
  'APPOINTMENT',
  appointment_id,
  NOW() - make_interval(days => rn::int),
  NOW() - make_interval(days => rn::int)
FROM cancelled_appts
WHERE rn <= 2
UNION ALL
SELECT
  format('seed_cm_alert_payment_%s_%s', clinic_code, lpad(rn::text, 2, '0')),
  clinic_id,
  created_by,
  doctor_id,
  'PAYMENT_PENDING'::"InternalAlertType",
  'Pago pendiente',
  format('El paciente %s mantiene un cobro pendiente de cierre.', patient_name),
  'APPOINTMENT',
  appointment_id,
  NOW() - make_interval(hours => (2 * rn)::int),
  NOW() - make_interval(hours => (2 * rn)::int)
FROM pending_appts
WHERE rn <= 3
UNION ALL
SELECT
  format('seed_cm_alert_conflict_%s_%s', clinic_code, lpad(rn::text, 2, '0')),
  clinic_id,
  CASE WHEN clinic_code = 'ctro' THEN 'seed_cm_usr_admin' ELSE 'seed_cm_usr_admin_ops' END,
  doctor_id,
  'APPOINTMENT_CONFLICT'::"InternalAlertType",
  'Revision de agenda',
  'Se recomienda validar solapamientos y confirmaciones del bloque de hoy.',
  NULL,
  NULL,
  NOW() - make_interval(mins => (15 * rn)::int),
  NOW() - make_interval(mins => (15 * rn)::int)
FROM conflict_basis
WHERE rn <= 2
UNION ALL
SELECT
  'seed_cm_alert_custom_global',
  'seed_cm_clinic_centro',
  'seed_cm_usr_admin',
  NULL,
  'CUSTOM'::"InternalAlertType",
  'Revision operativa mensual',
  'Seed mensual cargado. Revisa dashboard, CRM, agenda y fichas clinicas.',
  NULL,
  NULL,
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '10 minutes';

INSERT INTO "InternalAlertRecipient" (
  id, "alertId", "userId", "deliveryStatus", "deliveryError", "deliveredAt", "readAt", "createdAt", "updatedAt"
)
SELECT
  ia.id || '_admin',
  ia.id,
  CASE WHEN ia."clinicId" = 'seed_cm_clinic_centro' THEN 'seed_cm_usr_admin' ELSE 'seed_cm_usr_admin_ops' END,
  'SENT'::"InternalAlertDeliveryStatus",
  NULL,
  ia."createdAt" + INTERVAL '2 minutes',
  CASE WHEN ia."eventType" IN ('PAYMENT_PENDING', 'APPOINTMENT_CANCELLED') THEN ia."createdAt" + INTERVAL '25 minutes' ELSE NULL END,
  ia."createdAt",
  ia."updatedAt"
FROM "InternalAlert" ia
WHERE ia.id LIKE 'seed_cm_alert_%'
UNION ALL
SELECT
  ia.id || '_doctor',
  ia.id,
  ia."doctorId",
  CASE
    WHEN ia."eventType" = 'APPOINTMENT_CONFLICT' THEN 'FAILED'::"InternalAlertDeliveryStatus"
    ELSE 'SENT'::"InternalAlertDeliveryStatus"
  END,
  CASE
    WHEN ia."eventType" = 'APPOINTMENT_CONFLICT' THEN 'Canal interno temporalmente no disponible.'
    ELSE NULL
  END,
  CASE
    WHEN ia."doctorId" IS NULL OR ia."eventType" = 'APPOINTMENT_CONFLICT' THEN NULL
    ELSE ia."createdAt" + INTERVAL '5 minutes'
  END,
  CASE
    WHEN ia."doctorId" IS NULL THEN NULL
    WHEN ia."eventType" IN ('APPOINTMENT_CREATED', 'CUSTOM') THEN NULL
    ELSE ia."createdAt" + INTERVAL '30 minutes'
  END,
  ia."createdAt",
  ia."updatedAt"
FROM "InternalAlert" ia
WHERE ia.id LIKE 'seed_cm_alert_%'
  AND ia."doctorId" IS NOT NULL;

INSERT INTO "FhirLink" (
  id, "clinicId", "resourceType", "internalId", "fhirId",
  "identifierSystem", "identifierValue", "identifierKey", "createdAt", "updatedAt"
)
SELECT
  format('seed_cm_fhir_patient_%s_%s', pp.clinic_code, lpad(pp.patient_slot::text, 2, '0')),
  pp.clinic_id,
  'PATIENT'::"FhirLinkResourceType",
  pp.patient_id,
  format('Patient/%s', pp.patient_id),
  'http://medigest.test/fhir/patient-run',
  pp.run_normalized,
  'run:' || pp.run_normalized,
  NOW(),
  NOW()
FROM seed_cm_patient_pool pp
WHERE pp.patient_slot <= 6;

INSERT INTO "FhirLink" (
  id, "clinicId", "resourceType", "internalId", "fhirId",
  "identifierSystem", "identifierValue", "identifierKey", "createdAt", "updatedAt"
)
SELECT
  format('seed_cm_fhir_appt_%s_%s', clinic_code, lpad(rn::text, 2, '0')),
  clinic_id,
  'APPOINTMENT'::"FhirLinkResourceType",
  appointment_id,
  format('Appointment/%s', appointment_id),
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
FROM (
  SELECT
    clinic_id,
    clinic_code,
    appointment_id,
    row_number() OVER (PARTITION BY clinic_id ORDER BY start_at) AS rn
  FROM seed_cm_generated_appointments
  WHERE calendar_day >= CURRENT_DATE - INTERVAL '5 days'
    AND calendar_day <= CURRENT_DATE + INTERVAL '5 days'
) s
WHERE rn <= 6;

INSERT INTO "FhirLink" (
  id, "clinicId", "resourceType", "internalId", "fhirId",
  "identifierSystem", "identifierValue", "identifierKey", "createdAt", "updatedAt"
)
SELECT
  format('seed_cm_fhir_visit_%s_%s', clinic_code, lpad(rn::text, 2, '0')),
  clinic_id,
  'ENCOUNTER'::"FhirLinkResourceType",
  visit_id,
  format('Encounter/%s', visit_id),
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
FROM (
  SELECT
    clinic_id,
    clinic_code,
    visit_id,
    row_number() OVER (PARTITION BY clinic_id ORDER BY start_at DESC) AS rn
  FROM seed_cm_completed_care
) s
WHERE rn <= 5;

INSERT INTO "FhirLink" (
  id, "clinicId", "resourceType", "internalId", "fhirId",
  "identifierSystem", "identifierValue", "identifierKey", "createdAt", "updatedAt"
)
SELECT
  format('seed_cm_fhir_obs_%s_%s', clinic_code, lpad(rn::text, 2, '0')),
  clinic_id,
  'OBSERVATION'::"FhirLinkResourceType",
  observation_id,
  format('Observation/%s', observation_id),
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
FROM (
  SELECT
    o."clinicId" AS clinic_id,
    CASE WHEN o."clinicId" = 'seed_cm_clinic_centro' THEN 'ctro' ELSE 'nrt' END AS clinic_code,
    o.id AS observation_id,
    row_number() OVER (PARTITION BY o."clinicId" ORDER BY o."effectiveAt" DESC) AS rn
  FROM "Observation" o
  WHERE o.id LIKE 'seed_cm_obs_note_%'
) s
WHERE rn <= 5;

INSERT INTO "AuditLog" (id, "occurredAt", event, author, detail) VALUES
  ('seed_cm_audit_01', NOW() - INTERVAL '20 days', 'SEED_CM_PATIENTS_CREATED', 'admin.seed@medigest.test', 'Pacientes de prueba cargados para ambas sedes.'),
  ('seed_cm_audit_02', NOW() - INTERVAL '15 days', 'SEED_CM_APPOINTMENTS_CREATED', 'secretaria.centro.seed@medigest.test', 'Agenda completa del mes actual generada para sede centro.'),
  ('seed_cm_audit_03', NOW() - INTERVAL '14 days', 'SEED_CM_APPOINTMENTS_CREATED', 'secretaria.norte.seed@medigest.test', 'Agenda completa del mes actual generada para sede norte.'),
  ('seed_cm_audit_04', NOW() - INTERVAL '11 days', 'SEED_CM_PAYMENTS_REGISTERED', 'admin.ops.seed@medigest.test', 'Se registraron pagos y atenciones clinicas de prueba.'),
  ('seed_cm_audit_05', NOW() - INTERVAL '8 days', 'SEED_CM_RECORDS_CREATED', 'doctor.general.seed@medigest.test', 'Se generaron fichas clinicas y observaciones.'),
  ('seed_cm_audit_06', NOW() - INTERVAL '5 days', 'SEED_CM_CRM_POPULATED', 'admin.seed@medigest.test', 'Pipeline y seguimiento comercial cargados con leads de prueba.'),
  ('seed_cm_audit_07', NOW() - INTERVAL '1 day', 'SEED_CM_ALERTS_CREATED', 'admin.ops.seed@medigest.test', 'Alertas internas sembradas para panel de notificaciones.'),
  ('seed_cm_audit_08', NOW(), 'SEED_CM_EXECUTED', 'system@seed.medigest.test', 'Seed del mes actual ejecutado correctamente.');

COMMIT;

-- ============================================================================
-- CREDENCIALES DE PRUEBA
-- Todos usan password: Test1234!
--
-- ADMIN       admin.seed@medigest.test
-- ADMIN       admin.ops.seed@medigest.test
-- DOCTOR      doctor.general.seed@medigest.test
-- DOCTOR      doctor.ortho.seed@medigest.test
-- DOCTOR      doctor.endo.seed@medigest.test
-- DOCTOR      doctor.implants.seed@medigest.test
-- DOCTOR      doctor.multi.seed@medigest.test
-- SECRETARY   secretaria.centro.seed@medigest.test
-- SECRETARY   secretaria.norte.seed@medigest.test
-- EDGE        doctor.suspended.seed@medigest.test
-- EDGE        secretaria.pending.seed@medigest.test
-- EDGE        doctor.nuevo.seed@medigest.test
-- ============================================================================
