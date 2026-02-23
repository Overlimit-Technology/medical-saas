
### Requerimientos ERS Sprint 

#### PAC-001 (CRUD pacientes)
Estado: **completo (backend + UI base)**  
- Crear/editar/listar pacientes con validacion de RUN unico.
- No permite eliminar si tiene citas futuras.
- UI base con listado y formulario.
Pendiente fino:
- Falta pantalla de detalle/historial completo como mockup (y UX de confirmacion al eliminar).

#### CIT-001 a CIT-005 (citas, agenda, conflictos, filtros)
Estado: **parcial**
- CIT-001 Crear cita: **completo** (API + formulario).
- CIT-002 Editar cita: **parcial** (API + drag & drop para mover en agenda).
- CIT-003 Anular/Eliminar cita: **parcial** (API de cancelacion con auditoria; falta UI/confirmacion).
- CIT-004 Visualizar agenda: **parcial** (vista semanal; faltan dia/mes y filtros visuales por rol).
- CIT-005 Buscar/filtrar: **parcial** (API soporta filtros; UI aun no).

#### ENT-001 / ENT-002 (CRUD doctores y boxes)
Estado: **parcial**
- Doctores: **completo en API + UI base** (crear/listar con RUT unico).
- Boxes: **completo en API + UI base**.
Pendiente fino:
- UI para asociar doctores a multiples sedes.
- Guardado/asignacion de boxes por sede (solo admin).
- Escenarios de asignacion de medicos por sede: doctor asociado a 3 sedes; doctor asociado a 2 sedes; doctor asociado a 1 sede.
- Confirmaciones de eliminacion y visualizacion de "desactivado" cuando hay citas futuras.

#### CRM-001 / CRM-002 (contactos, cobros y notificaciones)
Estado: **parcial**
- CRM-001 Gestion de contactos y cobros: **completo en API + UI base**.
- CRM-002 Automatizacion de procesos y notificaciones: **parcial (iteracion 2)**.
Definicion funcional CRM-002:
- Usuario responsable: **Administrador**.
- Notificaciones orientadas a la comunicacion entre paciente y profesional.
- Canal habilitado y alcance actual: **solo correo electronico**.
- No existe un modulo manual de envio: las notificaciones se disparan por accion del sistema.
- Acciones con notificacion automatica:
- Usuario nuevo: correo de bienvenida + credenciales temporales.
- Paciente nuevo: correo de confirmacion de registro en ZENSYA.
- Cita creada/reagendada: correo al paciente con fecha y hora.
- Cobro/pago registrado: correo al paciente con estado y monto.
Validacion esperada:
- Sesion iniciada para ejecutar la accion (rol segun modulo).
- Al completar la accion, se intenta envio por correo al destinatario correspondiente.
- Si falla correo, la accion principal se mantiene y se informa advertencia.

### Requerimientos implementados (infra base)

#### 1. **Autenticacion**
- Login con email y contrasena.
- Validacion de credenciales con bcrypt.
- Sesion segura mediante cookies firmadas (`mg_session`).
- Verificacion de estado de usuario (ACTIVE).
- Logout con limpieza de cookies.
- Endpoint `/api/auth/me` para verificar sesion actual.

#### 2. **Seleccion de clinica**
- Multi-tenant con soporte para multiples clinicas.
- Seleccion de clinica activa mediante cookie firmada (`mg_clinic`).
- Validacion de membresia activa del usuario en la clinica.
- Listado de clinicas disponibles para el usuario autenticado.
- Redireccion automatica segun estado de sesion y clinica.

#### 3. **Proteccion de rutas**
- Middleware que protege rutas segun autenticacion y contexto de clinica.
- Redirecciones automaticas:
  - Sin sesion -> `/login`
  - Con sesion pero sin clinica -> `/select-clinic`
  - Con sesion y clinica -> `/dashboard`

### Funcionalidades nuevas agregadas

- Modelos nuevos en Prisma: `Patient`, `DoctorProfile`, `Box`, `Appointment`.
- Servicios de dominio en servidor para CRUD y reglas: pacientes, doctores, boxes, citas.
- Validacion de conflictos de agenda (doctor/box/paciente).
- Auditoria basica para cancelacion de citas (`AuditLog`).
- UI base de panel con sidebar + paginas de pacientes, doctores, boxes y agenda semanal con drag & drop.

### Rutas/API nuevas

- `GET/POST /api/patients`
- `GET/PATCH/DELETE /api/patients/[id]`
- `GET/POST /api/doctors`
- `PATCH/DELETE /api/doctors/[id]`
- `GET/POST /api/boxes`
- `PATCH/DELETE /api/boxes/[id]`
- `GET/POST /api/appointments`
- `PATCH/DELETE /api/appointments/[id]`

### Arquitectura

El proyecto sigue una arquitectura en capas:

- **Dominio** (`src/domain/`): Entidades, casos de uso, contratos de repositorios
- **Datos** (`src/data/`): Implementaciones HTTP de repositorios
- **Presentación** (`src/presentation/`): Componentes UI y ViewModels
- **Servidor** (`src/server/`): Servicios de negocio y lógica server-side
- **API** (`src/app/api/`): Route handlers de Next.js

### Proximos pasos

- UI de detalle de paciente (historial y validacion/confirmacion de eliminacion).
- Agenda con vistas dia/mes y filtros visibles por rol.
- Flujo de edicion/cancelacion con confirmaciones en UI.
- Asociar doctores a multiples sedes desde UI.
