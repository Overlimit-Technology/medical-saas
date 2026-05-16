# Documentacion tecnica del software

MediGest / ZENSYA

Revision basada en el repositorio actual al 2026-04-27.

Objetivo: entregar un mapa tecnico corto, preciso y util para onboarding. Este documento describe como esta compuesto el software, que stack usa, como se organiza y cuales son sus modulos funcionales.

## 1. Resumen ejecutivo

- El sistema es un monolito full-stack en Next.js: frontend, backend HTTP y renderizado viven en el mismo repositorio.
- El negocio principal es gestion clinica multi-sede: usuarios, pacientes, agenda, atenciones, fichas, pagos y operacion interna.
- La multi-tenencia no depende solo del usuario autenticado: depende de la sesion activa y de la sede seleccionada.
- PostgreSQL guarda el dominio principal del negocio. MongoDB se usa solo para mensajeria interna y Meta inbox.
- El control de acceso combina rol, permisos finos y sede activa.
- El software no sigue una clean architecture estricta en todos los modulos: la base general esta separada por capas, pero CRM comercial y algunas UIs usan flujos mas directos.
- El nombre tecnico del repo es `medigest`, pero la marca visible en UI y correos es `ZENSYA`.

## 2. Stack tecnico

- Frontend: `Next.js 14`, `React 18`, `TypeScript`, `Tailwind CSS`.
- Backend HTTP: `Route Handlers` de Next.js en `src/app/api`.
- Persistencia relacional: `PostgreSQL` con `Prisma`.
- Persistencia documental: `MongoDB` para chat interno y Meta inbox.
- Autenticacion: cookies firmadas propias (`mg_session` y `mg_clinic`) con hash HMAC y contrasenas con `bcryptjs`.
- Validacion: `Zod`.
- Archivos y media: `Cloudinary`.
- Correo: `Nodemailer`.
- PDF cliente: `jsPDF`.
- Fechas y utilidades: `date-fns`.
- Interoperabilidad: capa propia FHIR R4 en `src/server/fhir/r4`.

## 3. Arquitectura general

### 3.1 Capas del repositorio

- `src/app`: rutas UI y endpoints HTTP de Next.js.
- `src/presentation`: componentes de interfaz y view models client-side.
- `src/domain`: entidades, contratos y use cases.
- `src/data`: repositorios HTTP consumidos desde frontend.
- `src/server`: logica de negocio server-side.
- `src/lib`: infraestructura transversal, helpers y adaptadores.
- `prisma`: esquema de datos, migraciones y seeds.
- `docs/hl7`: documentacion tecnica de interoperabilidad.

### 3.2 Flujo tecnico mas comun

1. Una ruta `page.tsx` en `src/app` define el punto de entrada.
2. La pagina monta un componente de `src/presentation`.
3. La UI consume un view model que usa `src/domain` y `src/data`, o en algunos modulos hace `fetch` directo.
4. El frontend llama a una API en `src/app/api`.
5. El route handler valida sesion, rol, permisos y sede.
6. El route handler delega en un servicio de `src/server`.
7. El servicio aplica reglas de negocio y persiste en Prisma, MongoDB o Cloudinary.

### 3.3 Excepciones importantes al patron

- `leads` y parte del escritorio CRM usan `fetch` directo desde `LeadsViewModel.tsx`.
- `chat-meta` funciona como submodulo vertical y no replica toda la estructura `domain + data`.
- varios dashboards y algunas rutas de usuarios concentran mas orquestacion en el route handler que en `src/server`.
- conclusion practica: la arquitectura es por capas, pero no todas las piezas tienen el mismo grado de separacion.

### 3.4 Multi-sede y seguridad

- La sesion usa `mg_session` para identidad, rol, permisos, expiracion y `mustChangePassword`.
- La sede activa usa `mg_clinic`.
- El middleware protege rutas y redirige segun sesion valida, cambio de contrasena obligatorio y sede seleccionada.
- La mayoria de los servicios filtra por `clinicId`; ese contexto es estructural, no opcional.
- La seguridad se apoya en:
- cookies `httpOnly` firmadas
- hashing de contrasenas
- validacion de payloads con Zod
- restricciones por rol y permiso
- control de acceso por membresia activa en la sede

## 4. Tipos de usuario y control de acceso

### 4.1 Roles base

- `ADMIN`: administra usuarios, sedes, configuraciones, agenda y modulos operativos segun permisos.
- `DOCTOR`: atiende pacientes, agenda propia, fichas, observaciones y funciones clinicas segun permisos.
- `SECRETARY`: operacion administrativa y soporte de agenda, notificaciones y otros modulos segun permisos.

### 4.2 Banderas y permisos

- `isSuperAdmin`: sobreescribe permisos y conserva acceso total aunque no tenga permisos marcados.
- Permisos funcionales actuales:
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

### 4.3 Idea operativa correcta

- rol y permiso no son lo mismo
- un usuario puede pertenecer a varias sedes
- el mismo usuario puede ver cosas distintas segun la sede activa
- el permiso `LEADS` es el que habilita la entrada al CRM comercial

## 5. Persistencia y modelo de datos

### 5.1 PostgreSQL

PostgreSQL guarda el dominio principal:

- identidad y acceso: `User`, `UserProfile`, `DoctorProfile`, `Session`, `Account`, `VerificationToken`
- multi-sede: `Clinic`, `ClinicMembership`, `ClinicSettings`
- operacion clinica: `Patient`, `Box`, `Appointment`, `ClinicalVisit`, `Observation`
- fichas: `FormTemplate`, `FormTemplateField`, `ClinicalRecord`, `ClinicalRecordValue`
- operacion comercial y financiera: `Treatment`, `PatientTreatment`, `PaymentHistory`, `CashMovement`, `professional payouts`
- CRM: `LeadColumn`, `CrmLead`, `CrmLeadNote`, `CrmLeadMessage`, `CrmLeadActivity`
- operacion interna: `InternalAlert`, `InternalAlertRecipient`, `AuditLog`
- interoperabilidad: `FhirLink`

### 5.2 MongoDB

MongoDB se usa solo para mensajeria:

- chat interno: `chat_conversations`, `chat_messages`
- Meta inbox: `meta_chat_conversations`, `meta_chat_messages`

### 5.3 Cloudinary y correo

- Cloudinary se usa para imagen de perfil, archivos de imagenologia y adjuntos de chat.
- El correo saliente se usa para alta de usuarios, liquidaciones y otros flujos puntuales.

## 6. Modulos del software

### Modulo 1. Acceso, login y cambio de contrasena

- Objetivo: autenticar al usuario, forzar cambio de contrasena inicial y crear contexto de acceso.
- Rutas UI: `/login`, `/change-password`.
- APIs: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/change-password`, `/api/auth/presence`.
- Piezas clave: `AuthServiceDb.ts`, `mgSession.ts`, `session.ts`, `middleware.ts`.

### Modulo 2. Seleccion de sede y contexto multi-clinica

- Objetivo: elegir la sede activa antes de entrar a los modulos de negocio.
- Rutas UI: `/select-clinic`.
- APIs: `/api/clinics/my`, `/api/clinics/select`, `/api/clinics/clear`.
- Piezas clave: `ClinicsService.ts`, `mgClinic.ts`, `clinicDisplay.ts`.

### Modulo 3. Dashboards y vista general

- Objetivo: mostrar resumen operativo por rol y estado general de la sede.
- Rutas UI: `/dashboard`, `/dashboard/admin`, `/dashboard/secretary`, `/clinic-dashboard`.
- APIs: `/api/dashboard/admin`, `/api/dashboard/doctor`, `/api/dashboard/secretary`, `/api/clinic-dashboard`.
- Nota: el `clinic-dashboard` funciona como panel de salud operativa de la sede.

### Modulo 4. Agenda y citas

- Objetivo: planificar citas, mover horarios, cancelar, cobrar y ver caja diaria.
- Rutas UI: `/agenda`, `/appointments/[id]`.
- APIs: `/api/appointments`, `/api/appointments/[id]`, `/api/agenda/banner`.
- Piezas clave: `AppointmentsService.ts`, `presentation/agenda/*`.
- Regla central: las validaciones de conflicto cruzan doctor, paciente y box dentro de la misma sede.

### Modulo 5. Pacientes

- Objetivo: CRUD de pacientes y consulta de historial basico.
- Rutas UI: `/patients`, `/patients/[id]`.
- APIs: `/api/patients`, `/api/patients/[id]`.
- Piezas clave: `PatientsService.ts`, `presentation/patients/*`.
- Regla central: `runNormalized` impone unicidad por sede y el borrado puede degradar a inactivacion si existen referencias.

### Modulo 6. Usuarios y doctores

- Objetivo: crear usuarios internos, asignar permisos y manejar perfiles medicos.
- Rutas UI: `/usuarios`, `/usuarios/[id]`, `/doctors`, `/doctors/[id]`.
- APIs: `/api/users`, `/api/users/[id]`, `/api/doctors`, `/api/doctors/[id]`.
- Piezas clave: `DoctorsService.ts`, `api/users/route.ts`.
- Regla central: al crear usuario se genera contrasena temporal y se envia por correo.

### Modulo 7. Boxes y recursos fisicos

- Objetivo: administrar boxes por sede.
- Rutas UI: `/boxes`, `/boxes/[id]`.
- APIs: `/api/boxes`, `/api/boxes/[id]`.
- Piezas clave: `BoxesService.ts`.

### Modulo 8. Atencion clinica y observaciones

- Objetivo: registrar la visita clinica y sus observaciones medicas.
- Rutas UI: `/clinical-visits`.
- APIs: `/api/clinical-visits`.
- Piezas clave: `ClinicalVisitsService.ts`, `ObservationsService.ts`.
- Nota: `Observation` es una entidad clinica propia y ademas es base para interoperabilidad FHIR.

### Modulo 9. Plantillas y fichas clinicas

- Objetivo: definir formularios dinamicos y guardar fichas clinicas por cita.
- Rutas UI: `/form-templates`.
- APIs: `/api/form-templates`, `/api/form-templates/[id]`, `/api/clinical-records`, `/api/clinical-records/[id]`.
- Piezas clave: `FormTemplatesService.ts`, `ClinicalRecordsService.ts`.
- Nota: desde frontend existe exportacion PDF de ficha.

### Modulo 10. Tratamientos, cobros y caja diaria

- Objetivo: manejar catalogo de tratamientos, pagos por paciente y movimientos de caja.
- Rutas UI: `/treatments`.
- APIs: `/api/treatments`, `/api/treatments/[id]`, `/api/crm/treatments`, `/api/crm/payment-history`, `/api/crm/daily-cash`, `/api/crm/daily-cash/movement`.
- Piezas clave: `TreatmentsService.ts`, `CrmService.ts`.
- Nota critica: en este repo `api/crm` significa operacion financiera, no pipeline comercial.

### Modulo 11. Seguimiento

- Objetivo: seguir tratamientos realizados y su estado de cobro.
- Rutas UI: `/seguimiento`.
- APIs: `/api/seguimiento`.
- Piezas clave: `SeguimientoService.ts`.
- Nota: cruza `PatientTreatment` y `PaymentHistory`.

### Modulo 12. Liquidaciones a profesionales

- Objetivo: calcular pagos a doctores segun cobros pagados y porcentajes de la sede.
- Rutas UI: `/liquidaciones`.
- APIs: `/api/professional-payouts`, `/api/professional-payouts/send-email`, `/api/clinic-settings/professional-payouts`.
- Piezas clave: `ProfessionalPayoutsService.ts`, `ClinicSettingsService.ts`.

### Modulo 13. Notificaciones internas

- Objetivo: generar alertas internas persistentes con seguimiento de lectura y entrega.
- Rutas UI: `/notifications`.
- APIs: `/api/internal-alerts`, `/api/internal-alerts/[id]/read`.
- Piezas clave: `InternalAlertsService.ts`.

### Modulo 14. Mensajeria interna

- Objetivo: chat interno entre usuarios de la misma sede.
- Rutas UI: `/chat`.
- APIs: `/api/chat/contacts`, `/api/chat/messages`, `/api/chat/upload-signature`.
- Piezas clave: `ChatService.ts`, `mongodb.ts`, `cloudinary.ts`.
- Persistencia: MongoDB.

### Modulo 15. Vacaciones del equipo

- Objetivo: solicitudes de vacaciones, aprobaciones y limites por profesional.
- Rutas UI: `/vacaciones`.
- APIs: `/api/vacations/me`, `/api/vacations/team`.
- Piezas clave: `VacationsService.ts`, `presentation/vacations/*`.
- Nota critica: no tiene tablas propias; reutiliza `InternalAlert` como almacenamiento funcional.

### Modulo 16. Perfil, archivos e imagenologia

- Objetivo: gestionar el perfil del usuario y subidas de archivos.
- Rutas UI: `/profile`.
- APIs: `/api/profile/me`, `/api/profile/upload`, `/api/imaging/upload`.
- Piezas clave: `ProfileRepository.ts`, `cloudinary.ts`.

### Modulo 17. Interoperabilidad HL7 / FHIR R4

- Objetivo: exponer recursos clinicos bajo una capa FHIR R4 propia.
- APIs: `/api/fhir/r4`, `/api/fhir/r4/metadata`, `/api/fhir/r4/Patient`, `/api/fhir/r4/Appointment`, `/api/fhir/r4/Observation`.
- Piezas clave: `src/server/fhir/r4/*`, `FhirLinkService.ts`, `docs/hl7/*`.
- Nota: existe correlacion de ids internos vs ids FHIR por sede.

### Modulo 18. CRM comercial e inbox social

- Objetivo: concentrar pipeline de leads, contactos, actividades e inbox de canales sociales.
- Rutas UI: `/crm`, `/leads`, `/chat-meta`.
- APIs: `/api/leads/*`, `/api/chat-meta/*`, `/api/webhooks/meta/instagram`, `/api/webhooks/meta/whatsapp`.
- Piezas clave: `LeadsCrmService.ts`, `MetaChatService.ts`, `CrmDesktop.tsx`, `LeadsViewModel.tsx`.
- Estado real:
- hay base tecnica funcional para pipeline de leads, actividades, notas, mensajes e inbox Meta
- `/crm` entra por `src/presentation/leads/CrmDesktop.tsx`
- `src/presentation/crm/*` existe, pero no es el entrypoint del CRM comercial actual
- `MetaChatService` ya considera `WHATSAPP`, `INSTAGRAM` y `MESSENGER` como canales
- hoy existen webhooks activos para Instagram y WhatsApp
- la integracion Facebook/Messenger existe solo como base tecnica inicial y placeholders, no como flujo cerrado
- a nivel de producto, el CRM todavia esta pendiente de consolidacion y la primera etapa debe enfocarse en Facebook, Instagram y WhatsApp

## 7. Puntos que un ingeniero nuevo debe entender rapido

- El software es multi-sede por diseno. Casi toda regla importante depende de `clinicId`.
- `middleware.ts` y `requireClinicSession` son parte del comportamiento real, no solo seguridad decorativa.
- `src/server` contiene la mayor parte de las reglas de negocio que importan.
- El nombre `CRM` esta sobrecargado:
- `api/crm/*` = cobros, caja y pagos
- `leads + crm + chat-meta` = CRM comercial
- MongoDB no es base de negocio general; solo chat interno y canales Meta.
- Vacaciones usa `InternalAlert` como almacenamiento y no un modelo propio.
- La app mezcla nombre tecnico `medigest` con marca visible `ZENSYA`.

## 8. Orden sugerido de lectura tecnica

1. `package.json`
2. `prisma/schema.prisma`
3. `src/middleware.ts`
4. `src/lib/permissions.ts`
5. `src/lib/session.ts`
6. `src/app/(app)` para ubicar las rutas protegidas reales
7. `src/app/api` para ver contratos HTTP por modulo
8. `src/server` para entender reglas de negocio
9. `src/presentation` para entender la UI y donde hay `fetch` directo

## 9. Orden sugerido si la persona entra a trabajar en CRM

1. `src/app/(app)/crm/page.tsx`
2. `src/presentation/leads/CrmDesktop.tsx`
3. `src/presentation/leads/Leads.tsx`
4. `src/presentation/leads/LeadsViewModel.tsx`
5. `src/server/leads/LeadsCrmService.ts`
6. `src/app/api/leads/pipeline/route.ts`
7. `src/app/api/leads/[id]/route.ts`
8. `src/presentation/leads/tabs/CrmInbox.tsx`
9. `src/server/chat-meta/MetaChatService.ts`
10. `src/app/api/webhooks/meta/instagram/route.ts`
11. `src/app/api/webhooks/meta/whatsapp/route.ts`

## 10. Cierre operativo

- La plataforma ya cubre operacion clinica, administrativa, financiera y de interoperabilidad.
- El nucleo estable hoy esta en agenda, pacientes, usuarios, atencion clinica, fichas, pagos, liquidaciones y alertas.
- El CRM no debe leerse como modulo terminado de punta a punta: ya hay base tecnica util, pero el producto aun necesita consolidacion funcional.
- El foco inicial recomendado para ese CRM es social-first: Facebook, Instagram y WhatsApp.
