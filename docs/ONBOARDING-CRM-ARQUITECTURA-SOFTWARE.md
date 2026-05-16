# Arquitectura De Software Y Onboarding CRM

## Objetivo
Este documento explica como esta compuesto el software, que stack usa, como se organiza por capas y que modulos existen. El foco principal es acelerar el onboarding tecnico de una persona nueva que va a trabajar en CRM.

## 1. Que es este sistema
- Es un sistema de gestion clinica multi-sede.
- El frontend y el backend viven en una sola aplicacion Next.js.
- La sede activa no se toma del usuario solamente: se toma de una combinacion de sesion autenticada mas una clinica seleccionada.
- El repositorio mezcla dos nombres:
  - `medigest`: nombre tecnico del repo, package y varias rutas internas.
  - `ZENSYA`: nombre visible en UI, correos y algunos textos de negocio.

## 2. Stack Tecnico
- Frontend: `Next.js 14.2.35`, `React 18`, `TypeScript 5`, `Tailwind CSS 3.4.1`.
- Backend HTTP: `Next.js Route Handlers` dentro de `src/app/api`.
- ORM y acceso relacional: `Prisma 7.1.0` con `@prisma/adapter-pg` + `pg`.
- Base de datos principal: `PostgreSQL`.
- Base de datos secundaria: `MongoDB` para mensajeria interna y Meta inbox.
- Validacion: `Zod`.
- Autenticacion: cookies firmadas + `bcryptjs`.
- Archivos y assets: `Cloudinary`.
- Correo: `Nodemailer` expuesto a traves de `/api/email/send`.
- PDF cliente: `jsPDF`.
- Fechas y utilidades: `date-fns`.

## 3. Infraestructura Y Persistencia

### 3.1 PostgreSQL
PostgreSQL guarda el dominio principal del negocio:
- usuarios, perfiles, roles y membresias de clinica
- pacientes
- boxes
- citas
- pagos
- tratamientos
- fichas clinicas y plantillas
- CRM de leads
- alertas internas
- configuracion de clinica
- enlaces FHIR

El esquema esta centralizado en `prisma/schema.prisma`.

### 3.2 MongoDB
MongoDB no reemplaza PostgreSQL. Se usa solo para mensajeria:
- chat interno: colecciones `chat_conversations` y `chat_messages`
- inbox Meta: colecciones `meta_chat_conversations` y `meta_chat_messages`

Archivos clave:
- `src/lib/mongodb.ts`
- `src/server/chat/ChatService.ts`
- `src/server/chat-meta/MetaChatService.ts`

### 3.3 Cloudinary
Cloudinary se usa para:
- imagenes de perfil
- assets de imagenologia
- adjuntos de chat

Archivos clave:
- `src/lib/cloudinary.ts`
- `src/app/api/profile/upload/route.ts`
- `src/app/api/imaging/upload/route.ts`
- `src/app/api/chat/upload-signature/route.ts`

## 4. Arquitectura General

### 4.1 Flujo mas comun
El flujo predominante del sistema es este:

1. `src/app/.../page.tsx` define la ruta.
2. La pagina renderiza un componente de `src/presentation/...`.
3. El componente o view model usa:
   - `src/data/...` para repositorios HTTP
   - `src/domain/...` para entidades y use cases
4. El repositorio llama a `src/app/api/**/route.ts`.
5. El route handler valida sesion, rol, permisos y sede.
6. El route handler delega a `src/server/**/Service.ts`.
7. El service aplica reglas de negocio y persiste con Prisma, MongoDB o Cloudinary.

### 4.2 No todo el repo sigue exactamente ese patron
Hay modulos que rompen o simplifican la arquitectura:
- `leads` y parte de CRM hacen `fetch` directo desde el view model en vez de usar `data/` + `domain/usecases`.
- `chat-meta` tambien consume APIs de forma directa desde UI.
- varias rutas FHIR van directo de `route.ts` a servicios/mappers server-side.
- `src/app/api/users/route.ts` concentra bastante orquestacion en el route handler.

La conclusion practica es esta:
- el sistema tiene una arquitectura por capas
- pero no es una clean architecture pura
- CRM comercial es la parte menos estricta en ese sentido

## 5. Estructura De Carpetas
- `src/app`: rutas Next.js y endpoints HTTP.
- `src/presentation`: UI client-side, componentes y view models.
- `src/data`: repositorios HTTP usados desde frontend.
- `src/domain`: entidades, contratos de repositorio, esquemas y use cases.
- `src/server`: logica de negocio server-side.
- `src/lib`: infraestructura transversal, auth, prisma, mongo, cloudinary, normalizacion y utilidades.
- `prisma`: esquema, migraciones y seeds.
- `docs/hl7`: documentacion tecnica de interoperabilidad FHIR/HL7.

## 6. Sesion, Multi-Sede Y Permisos

### 6.1 Sesion
La sesion no usa NextAuth como flujo principal. Usa cookies firmadas:
- `mg_session`: identidad, rol, permisos, expiracion, `mustChangePassword`
- `mg_clinic`: sede seleccionada

Archivos clave:
- `src/lib/session.ts`
- `src/server/auth/mgSession.ts`
- `src/server/clinics/mgClinic.ts`
- `src/server/auth/requireSession.ts`
- `src/middleware.ts`

### 6.2 Multi-sede
La multi-tenencia se apoya en:
- `Clinic`
- `ClinicMembership`
- filtro sistematico por `clinicId` en servicios y queries

En la practica:
- un usuario puede pertenecer a varias clinicas
- debe seleccionar una clinica activa
- casi todos los endpoints de negocio operan dentro de esa sede

### 6.3 Permisos
Los permisos de navegacion/accion estan definidos en `src/lib/permissions.ts`.

Permisos actuales:
- `AGENDA`
- `CLINICAL_VISITS`
- `CHAT`
- `CHAT_META`
- `LEADS`
- `PATIENTS`
- `USERS`
- `TREATMENTS`
- `BOXES`
- `SEGUIMIENTO`

## 7. Modelo De Datos Principal

### 7.1 Identidad Y Clinica
- `User`
- `UserProfile`
- `DoctorProfile`
- `Clinic`
- `ClinicMembership`
- `ClinicSettings`

### 7.2 Operacion Clinica
- `Patient`
- `Box`
- `Appointment`
- `ClinicalVisit`
- `Observation`
- `FormTemplate`
- `FormTemplateField`
- `ClinicalRecord`
- `ClinicalRecordValue`

### 7.3 Operacion Comercial Y Financiera
- `Treatment`
- `PatientTreatment`
- `PaymentHistory`
- `CashMovement`

### 7.4 CRM Comercial
- `LeadColumn`
- `CrmLead`
- `CrmLeadNote`
- `CrmLeadMessage`
- `CrmLeadActivity`

### 7.5 Alertas E Interoperabilidad
- `InternalAlert`
- `InternalAlertRecipient`
- `AuditLog`
- `FhirLink`

## 8. Modulos Del Sistema

### 8.1 Dashboard
Responsabilidad:
- panel por rol con metricas operativas
- resumen general de la sede

Rutas UI:
- `/dashboard`
- `/dashboard/admin`
- `/dashboard/secretary`
- `/clinic-dashboard`

APIs:
- `/api/dashboard/admin`
- `/api/dashboard/doctor`
- `/api/dashboard/secretary`
- `/api/clinic-dashboard`

Notas tecnicas:
- los dashboards consultan Prisma directamente desde los route handlers
- `clinic-dashboard` funciona como inventario de la sede: boxes, usuarios, pacientes, tratamientos y plantillas activas

### 8.2 Agenda Y Citas
Responsabilidad:
- agenda semanal
- creacion, edicion y cancelacion de citas
- control de estados y pagos asociados
- caja diaria desde la agenda

Rutas UI:
- `/agenda`
- `/appointments/[id]`

APIs:
- `/api/appointments`
- `/api/appointments/[id]`
- `/api/agenda/banner`

Servicios:
- `src/server/appointments/AppointmentsService.ts`

Reglas importantes:
- valida que paciente, doctor y box pertenezcan a la sede
- bloquea conflictos por solapamiento de doctor, box o paciente
- una cita pagada puede autocompletarse como `COMPLETED` si corresponde
- la agenda reutiliza el submodulo financiero de `crm` para caja diaria y cobros

Archivos para leer primero:
- `src/presentation/agenda/Agenda.tsx`
- `src/presentation/agenda/AgendaViewModel.tsx`
- `src/server/appointments/AppointmentsService.ts`

### 8.3 Pacientes
Responsabilidad:
- CRUD de pacientes
- busqueda por nombre, RUN y correo
- detalle con historial de citas

Rutas UI:
- `/patients`
- `/patients/[id]`

APIs:
- `/api/patients`
- `/api/patients/[id]`

Servicios:
- `src/server/patients/PatientsService.ts`

Reglas importantes:
- `runNormalized` se usa para unicidad por sede
- si se intenta borrar un paciente con referencias, puede quedar inactivo en vez de borrarse
- no permite eliminar pacientes con citas futuras o del dia en estados activos

### 8.4 Usuarios Y Doctores
Responsabilidad:
- alta de usuarios administrativos, secretarias y doctores
- permisos de navegacion
- membresias por sede
- perfil medico separado del perfil de usuario general

Rutas UI:
- `/usuarios`
- `/usuarios/[id]`
- `/doctors`
- `/doctors/[id]`

APIs:
- `/api/users`
- `/api/users/[id]`
- `/api/doctors`
- `/api/doctors/[id]`

Servicios:
- `src/server/doctors/DoctorsService.ts`
- parte del flujo de usuarios vive en `src/app/api/users/route.ts`

Reglas importantes:
- al crear usuario se genera password temporal y se envia correo
- doctores usan `DoctorProfile` y pueden pertenecer a varias clinicas
- si un doctor tiene citas futuras o relaciones activas, se suspende en vez de borrarse duro

### 8.5 Boxes
Responsabilidad:
- administracion de boxes por sede

Rutas UI:
- `/boxes`
- `/boxes/[id]`

APIs:
- `/api/boxes`
- `/api/boxes/[id]`

Servicios:
- `src/server/boxes/BoxesService.ts`

### 8.6 Cita Clinica Y Observaciones
Responsabilidad:
- inicio de atenciones clinicas
- registro clinico asociado a doctor, paciente y opcionalmente cita
- observaciones clinicas reutilizables en interoperabilidad

Rutas UI:
- `/clinical-visits`

APIs:
- `/api/clinical-visits`

Servicios:
- `src/server/clinical-visits/ClinicalVisitsService.ts`
- `src/server/observations/ObservationsService.ts`

Notas:
- `ClinicalVisit` es la visita clinica interna
- `Observation` existe en BD y tiene exposicion FHIR
- el acceso a `/clinical-visits` esta restringido a doctor con permiso `CLINICAL_VISITS`

### 8.7 Plantillas Y Fichas Clinicas
Responsabilidad:
- crear plantillas dinamicas de fichas
- registrar fichas clinicas por cita y paciente
- exportar ficha a PDF

Rutas UI:
- `/form-templates`

APIs:
- `/api/form-templates`
- `/api/form-templates/[id]`
- `/api/clinical-records`
- `/api/clinical-records/[id]`

Servicios:
- `src/server/form-templates/FormTemplatesService.ts`
- `src/server/clinical-records/ClinicalRecordsService.ts`

Reglas importantes:
- una plantilla con fichas ya creadas no se reescribe completa; se preserva y se puede inactivar
- los campos obligatorios se validan al crear ficha

### 8.8 Tratamientos
Responsabilidad:
- catalogo de tratamientos y precios base

Rutas UI:
- `/treatments`

APIs:
- `/api/treatments`
- `/api/treatments/[id]`

Servicios:
- `src/server/treatments/TreatmentsService.ts`

Reglas importantes:
- el `id` del tratamiento se maneja como string numerico
- el servicio normaliza ids legacy antes de listar o crear
- no se puede borrar un tratamiento con atenciones o pagos asociados

### 8.9 Seguimiento
Responsabilidad:
- seguimiento de tratamientos realizados y su estado de cobro

Rutas UI:
- `/seguimiento`

APIs:
- `/api/seguimiento`

Servicios:
- `src/server/seguimiento/SeguimientoService.ts`

Como funciona:
- toma `PatientTreatment`
- cruza los pagos asociados
- calcula si el caso esta `in_progress` o `completed`

### 8.10 Liquidaciones
Responsabilidad:
- calculo mensual de pagos a profesionales
- configuracion de porcentajes clinica/SII
- envio de resumen por correo
- exportacion a Excel desde frontend

Rutas UI:
- `/liquidaciones`

APIs:
- `/api/professional-payouts`
- `/api/professional-payouts/send-email`
- `/api/clinic-settings/professional-payouts`

Servicios:
- `src/server/professional-payouts/ProfessionalPayoutsService.ts`
- `src/server/clinic-settings/ClinicSettingsService.ts`

Reglas importantes:
- solo toma `PaymentHistory` en estado `PAID`
- considera solo pagos ligados a citas
- usa porcentajes guardados en `ClinicSettings`

### 8.11 Notificaciones Internas
Responsabilidad:
- alertas internas persistentes
- despacho opcional por correo
- feed de notificaciones para el usuario

Rutas UI:
- `/notifications`

APIs:
- `/api/internal-alerts`
- `/api/internal-alerts/[id]/read`

Servicios:
- `src/server/internal-alerts/InternalAlertsService.ts`

Reglas importantes:
- el creador valido es `ADMIN` o `SECRETARY`
- los destinatarios se resuelven por rol, doctor y membresia de sede
- se persiste estado de entrega y lectura

### 8.12 Chat Interno
Responsabilidad:
- mensajeria entre usuarios internos de la misma sede

Rutas UI:
- `/chat`

APIs:
- `/api/chat/contacts`
- `/api/chat/messages`
- `/api/chat/upload-signature`

Servicios:
- `src/server/chat/ChatService.ts`

Persistencia:
- MongoDB

Notas:
- verifica que ambos usuarios pertenezcan a la sede
- soporta adjuntos usando firma de Cloudinary

### 8.13 Vacaciones
Responsabilidad:
- solicitudes de vacaciones del usuario
- aprobacion/rechazo por administracion
- limite maximo consecutivo por profesional

Rutas UI:
- `/vacaciones`

APIs:
- `/api/vacations/me`
- `/api/vacations/team`

Servicios:
- `src/server/vacations/VacationsService.ts`

Importante:
- no tiene tablas propias en Prisma
- reutiliza `InternalAlert` con `referenceType=VACATION` y `referenceType=VACATION_LIMIT`
- es un modulo funcionalmente util, pero tecnicamente montado sobre la infraestructura de alertas

### 8.14 Perfil E Imagenologia
Responsabilidad:
- perfil del usuario
- subida de avatar
- subida de assets de imagenologia

Rutas UI:
- `/profile`

APIs:
- `/api/profile/me`
- `/api/profile/upload`
- `/api/imaging/upload`

Notas:
- las imagenes se almacenan en Cloudinary

### 8.15 FHIR / HL7
Responsabilidad:
- exponer interoperabilidad HL7 FHIR R4

APIs principales:
- `/api/fhir/r4`
- `/api/fhir/r4/metadata`
- `/api/fhir/r4/Patient`
- `/api/fhir/r4/Appointment`
- `/api/fhir/r4/Observation`

Servicios y piezas clave:
- `src/server/fhir/r4/*`
- `src/server/fhir/r4/FhirLinkService.ts`
- `src/server/fhir/r4/mappers/*`
- `src/server/fhir/r4/transaction.ts`

Notas:
- usa `FhirLink` para correlacionar ids internos con ids FHIR por sede
- devuelve `OperationOutcome` en errores
- hay documentacion complementaria en `docs/hl7`
- hoy existe `ClinicalVisit` internamente, pero no hay endpoint FHIR de `Encounter` en la ruta activa

## 9. CRM: Como Esta Realmente Dividido
Este es el punto mas importante para onboarding.

No hay un solo CRM. Hay tres piezas distintas que comparten nombre:

### 9.1 CRM Comercial Activo
Es el CRM que realmente se ve en `/crm`.

Ruta activa:
- `src/app/(app)/crm/page.tsx`

Entry point real:
- `src/presentation/leads/CrmDesktop.tsx`

Tabs del escritorio CRM:
- `pipeline`
- `inbox`
- `dashboard`
- `activities`
- `contacts`

Persistencia:
- `LeadColumn`
- `CrmLead`
- `CrmLeadNote`
- `CrmLeadMessage`
- `CrmLeadActivity`

Backend:
- `src/app/api/leads/**`
- `src/server/leads/LeadsCrmService.ts`

Frontend:
- `src/presentation/leads/*`

### 9.2 Inbox Meta
Aunque vive dentro de CRM funcionalmente, tecnicamente es otro submodulo.

Rutas:
- `/chat-meta`
- tab `inbox` dentro de `/crm`

APIs:
- `/api/chat-meta/conversations`
- `/api/chat-meta/messages`
- `/api/webhooks/meta/whatsapp`
- `/api/webhooks/meta/instagram`

Persistencia:
- MongoDB
- `meta_chat_conversations`
- `meta_chat_messages`

Servicio:
- `src/server/chat-meta/MetaChatService.ts`

### 9.3 CRM Operativo / Financiero
El nombre `crm` en backend NO significa pipeline comercial.

APIs:
- `/api/crm/treatments`
- `/api/crm/payment-history`
- `/api/crm/daily-cash`
- `/api/crm/daily-cash/movement`

Servicio:
- `src/server/crm/CrmService.ts`

Dominio / data:
- `src/domain/crm/*`
- `src/data/crm/*`

Uso real:
- caja diaria desde agenda
- historial de cobros por paciente
- registro de pagos y movimientos

### 9.4 UI CRM Legacy O Auxiliar
Existe una UI en:
- `src/presentation/crm/Crm.tsx`
- `src/presentation/crm/CrmViewModel.tsx`

Pero hoy:
- `/crm` NO usa esa UI
- `/crm` renderiza `src/presentation/leads/CrmDesktop.tsx`

Conclusion:
- `presentation/crm` no es el entrypoint del CRM comercial actual
- si alguien entra por ahi sin saber esto, va a seguir una ruta equivocada

## 10. CRM Comercial: Mapa De Archivos Para Empezar

### 10.1 Punto de entrada UI
1. `src/app/(app)/crm/page.tsx`
2. `src/presentation/leads/CrmDesktop.tsx`
3. `src/presentation/leads/Leads.tsx`
4. `src/presentation/leads/LeadsViewModel.tsx`

### 10.2 Componentes principales
- `src/presentation/leads/components/KanbanBoard.tsx`
- `src/presentation/leads/components/LeadDetailPanel.tsx`
- `src/presentation/leads/components/LeadForm.tsx`
- `src/presentation/leads/components/LeadTable.tsx`
- `src/presentation/leads/components/ColumnEditor.tsx`

### 10.3 Tabs del escritorio CRM
- `src/presentation/leads/tabs/CrmDashboard.tsx`
- `src/presentation/leads/tabs/CrmActivities.tsx`
- `src/presentation/leads/tabs/CrmContacts.tsx`
- `src/presentation/leads/tabs/CrmInbox.tsx`

### 10.4 APIs del pipeline
- `src/app/api/leads/pipeline/route.ts`
- `src/app/api/leads/route.ts`
- `src/app/api/leads/[id]/route.ts`
- `src/app/api/leads/[id]/archive/route.ts`
- `src/app/api/leads/[id]/convert/route.ts`
- `src/app/api/leads/[id]/notes/route.ts`
- `src/app/api/leads/[id]/messages/route.ts`
- `src/app/api/leads/columns/route.ts`
- `src/app/api/leads/columns/reorder/route.ts`
- `src/app/api/leads/seed/route.ts`

### 10.5 Servicio principal
- `src/server/leads/LeadsCrmService.ts`

Este servicio concentra casi toda la logica del pipeline:
- columnas
- leads
- archivado
- conversion a paciente
- notas
- mensajes
- actividades
- asignacion de doctores
- follow-ups
- seed inicial

### 10.6 Modelos de datos CRM
Buscar en `prisma/schema.prisma`:
- `LeadColumn`
- `CrmLead`
- `CrmLeadNote`
- `CrmLeadMessage`
- `CrmLeadActivity`

Campos importantes de `CrmLead`:
- `columnId`
- `channel`
- `priority`
- `estimatedBudget`
- `tags`
- `scrapedData`
- `archived`
- `converted`
- `convertedPatientId`
- `followUpDate`
- `assignedDoctorId`

## 11. CRM Comercial: Reglas De Negocio Relevantes
- si una clinica no tiene columnas, `LeadsCrmService.ensureDefaultColumns()` las crea automaticamente
- mover un lead entre columnas crea actividad tipo `moved`
- convertir lead a paciente mueve el lead a la ultima columna y marca `converted=true`
- el pipeline usa `followUpDate` para alertas de seguimiento
- la carga inicial del pipeline devuelve tambien:
  - columnas
  - leads
  - tags
  - doctores asignables
  - follow-ups vencidos o del dia

## 12. CRM Comercial: Cosas Que Hay Que Saber Antes De Tocar Codigo
- `src/domain/leads` hoy solo tiene entidades; no replica la estructura completa de otros modulos.
- `LeadsViewModel.tsx` hace `fetch` directo a `/api/leads/*`.
- `/crm` y `/leads` comparten el mismo nucleo de pipeline.
- `/chat-meta` y la tab `inbox` consumen el mismo backend Meta.
- `/api/crm/*` no pertenece al pipeline comercial; pertenece a cobros/caja.
- hay seed dedicado para leads: `seed-leads-crm.json`.

## 13. Orden Recomendado De Lectura Para Un Ingeniero Nuevo En CRM
1. `prisma/schema.prisma` para entender entidades CRM.
2. `src/app/(app)/crm/page.tsx`.
3. `src/presentation/leads/CrmDesktop.tsx`.
4. `src/presentation/leads/LeadsViewModel.tsx`.
5. `src/server/leads/LeadsCrmService.ts`.
6. `src/app/api/leads/pipeline/route.ts` y `src/app/api/leads/[id]/route.ts`.
7. `src/presentation/leads/tabs/CrmInbox.tsx`.
8. `src/server/chat-meta/MetaChatService.ts`.
9. `src/app/api/webhooks/meta/whatsapp/route.ts` y `instagram/route.ts`.
10. `src/server/crm/CrmService.ts` solo si tambien va a tocar cobros o caja diaria.

## 14. Resumen Ejecutivo
- El sistema es una app Next.js monolitica con frontend y backend integrados.
- PostgreSQL guarda el dominio principal; MongoDB solo mensajeria.
- La multi-sede y los permisos son parte central del diseño.
- La mayoria de modulos siguen una arquitectura por capas.
- CRM comercial no coincide con `api/crm`; el pipeline real vive en `leads` + `chat-meta`.
- Para trabajar en CRM, el entrypoint correcto es `src/presentation/leads/CrmDesktop.tsx`, no `src/presentation/crm/Crm.tsx`.
