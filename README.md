# MediGest

Sistema de gestión clínica multi-tenant desarrollado con Next.js 14, diseñado para administrar citas, pacientes, equipo de trabajo y operaciones clínicas con soporte para múltiples clínicas y roles de usuario.

## 🚀 Tecnologías

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes, TypeScript
- **Base de datos**: PostgreSQL con Prisma ORM 7
- **Autenticación**: Cookies firmadas (HMAC-SHA256)
- **Validación**: Zod

## 📋 Requisitos previos

- Node.js 20+ 
- PostgreSQL 14+
- npm o yarn

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd medigest
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Base de datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/medigest"

# Seguridad (genera un string aleatorio largo y seguro)
SESSION_SECRET="tu-secreto-super-seguro-aqui-minimo-32-caracteres"

# Entorno
NODE_ENV="development"
```

Notas para cambiar la BD mas adelante (online):
- Local: define `DATABASE_URL` en `.env.local` (no se versiona).
- Produccion: define `DATABASE_URL` como variable de entorno en el hosting
  (o usa `.env.production` si tu plataforma lo soporta).

### 4. Configurar la base de datos

```bash
# Generar el cliente de Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# Poblar la base de datos con datos de prueba
npm run db:seed
npm run db:clinic-seed
```

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📝 Comandos disponibles

```bash
# Desarrollo
npm run dev          # Inicia el servidor de desarrollo

# Producción
npm run build        # Construye la aplicación para producción
npm run start        # Inicia el servidor de producción

# Base de datos
npm run db:seed      # Ejecuta el seed de usuarios
npm run db:clinic-seed  # Ejecuta el seed de clínicas y membresías

# Utilidades
npm run lint         # Ejecuta ESLint
npx prisma studio    # Abre Prisma Studio (GUI para la BD)
```

## 👤 Usuarios de prueba

Después de ejecutar `npm run db:seed`, puedes usar estas credenciales:

| Rol | Email | Contraseña |
|-----|-------|------------|
| ADMIN | admin@medigest.cl | Admin123! |
| DOCTOR | doctor@medigest.cl | Doctor123! |
| SECRETARY | secretaria@medigest.cl | Secre123! |


## Estado actual del proyecto

### Requerimientos ERS Sprint 1 

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

### Pr?ximos pasos

- UI de detalle de paciente (historial y validacion/confirmacion de eliminacion).
- Agenda con vistas dia/mes y filtros visibles por rol.
- Flujo de edicion/cancelacion con confirmaciones en UI.
- Asociar doctores a multiples sedes desde UI.

## 📁 Estructura del proyecto

```
medigest/
├── prisma/
│   ├── schema.prisma          # Esquema de base de datos
│   ├── seed.ts                # Seed de usuarios
│   └── clinic-seed.ts          # Seed de clínicas
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API Routes
│   │   ├── login/             # Página de login
│   │   ├── select-clinic/     # Página de selección de clínica
│   │   └── dashboard/         # Dashboard (placeholder)
│   ├── domain/                # Capa de dominio
│   ├── data/                  # Capa de datos (repositorios HTTP)
│   ├── presentation/          # Componentes UI y ViewModels
│   ├── server/                # Servicios server-side
│   └── lib/                   # Utilidades (prisma, session, password)
└── src/middleware.ts          # Middleware de protección de rutas
```

## 🔒 Seguridad

- Contraseñas hasheadas con bcrypt (10 rounds)
- Cookies httpOnly, secure en producción, sameSite=lax
- Validación de inputs con Zod
- Mensajes de error genéricos (no revelan información sensible)
- Aislamiento multi-tenant por `clinicId`

## 📄 Licencia

Privado - Todos los derechos reservados


DAtos de prueba 

ADMIN admin@medigest.cl / Admin123!

DOCTOR doctor@medigest.cl / Doctor123!

SECRETARY secretaria@medigest.cl / Secre123!

DOCTOR A doctor.A.multi.a@medigest.cl / Doctor123!

DOCTOR B doctor.B.multi.b@medigest.cl / Doctor123!



Doctores de prueba (cantidad de sedes):
- DOCTOR (doctor@medigest.cl): 3 sede
- DOCTOR A (doctor.A.multi.a@medigest.cl): 2 sedes
- DOCTOR B (doctor.B.multi.b@medigest.cl): 1 sedes