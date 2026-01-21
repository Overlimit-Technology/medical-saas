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

## ✅ Estado actual del proyecto

### Requerimientos implementados

#### 1. **Autenticación** ✅
- Login con email y contraseña
- Validación de credenciales con bcrypt
- Sesión segura mediante cookies firmadas (`mg_session`)
- Verificación de estado de usuario (ACTIVE)
- Logout con limpieza de cookies
- Endpoint `/api/auth/me` para verificar sesión actual

#### 2. **Selección de clínica** ✅
- Sistema multi-tenant con soporte para múltiples clínicas
- Selección de clínica activa mediante cookie firmada (`mg_clinic`)
- Validación de membresía activa del usuario en la clínica
- Listado de clínicas disponibles para el usuario autenticado
- Redirección automática según estado de sesión y clínica

#### 3. **Protección de rutas** ✅
- Middleware que protege rutas según autenticación y contexto de clínica
- Redirecciones automáticas:
  - Sin sesión → `/login`
  - Con sesión pero sin clínica → `/select-clinic`
  - Con sesión y clínica → `/dashboard`

### Arquitectura

El proyecto sigue una arquitectura en capas:

- **Dominio** (`src/domain/`): Entidades, casos de uso, contratos de repositorios
- **Datos** (`src/data/`): Implementaciones HTTP de repositorios
- **Presentación** (`src/presentation/`): Componentes UI y ViewModels
- **Servidor** (`src/server/`): Servicios de negocio y lógica server-side
- **API** (`src/app/api/`): Route handlers de Next.js

### Próximos pasos

- Sistema de permisos basado en roles
- Request Context centralizado
- Reglas de ownership (ABAC)
- UI diferenciada por rol (menús, navegación)
- CRUD de citas, pacientes, equipo de trabajo
- Dashboard con métricas
- Módulos adicionales (CRM, finanzas, mensajería)

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

