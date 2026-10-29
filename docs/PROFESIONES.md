# Profesiones

Cada profesional (rol DOCTOR en la base) tiene ahora una **profesion** (medico, psicologo, kinesiologo, etc.), ademas del texto libre `specialty`, que queda como detalle ("Ortodoncia", "Rehabilitacion deportiva").

## Modelo

- `Profession`: `clinicId` nulo = catalogo global; con valor = profesion propia de esa sede (opcion "Otra"). Unico por `(clinicId, slug)` y, para el catalogo global, por `slug`.
- `DoctorProfile.professionId` (opcional, `ON DELETE SET NULL`).
- Migracion `20261029130000_add_professions`: aditiva. Crea la tabla, siembra 13 profesiones globales y hace backfill: enlaza la profesion cuando `specialty` coincide (sin tildes ni genero) con una del catalogo. Lo que no calza queda sin profesion y conserva su `specialty`.
- El slug ignora tildes y el sufijo de genero (`Psicologo/a` = `Psicologo`), asi "Otra" no duplica el catalogo.

## API

| Ruta | Quien | Que hace |
| --- | --- | --- |
| `GET /api/professions` | cualquier sesion de sede | catalogo global + profesiones de la sede |
| `POST /api/professions` `{name}` | ADMIN | crea una profesion de la sede; si ya existe (global o propia) devuelve la existente |
| `PATCH /api/professions/:id` `{name}` | ADMIN | renombra una profesion de la sede (409 si choca) |
| `DELETE /api/professions/:id` | ADMIN | borra una profesion de la sede; quienes la tenian quedan sin profesion |

`POST /api/users`, `POST /api/doctors` y `PATCH /api/doctors/:id` aceptan `professionId` (existente, global o de las sedes del usuario) o `professionName` ("Otra": se busca o crea en la sede). `professionId: null` en el PATCH la quita. Las lecturas devuelven `doctorProfile.profession {id,name}`.

## Interfaz y textos

- Selector de profesion con "Otra..." en el alta de usuario y en el detalle (`src/presentation/doctors/ProfessionSelect.tsx`).
- Donde el texto era generico, "Doctor" pasa a "Profesional" (rol en listados, alta, mensajes de la API).
- Reserva publica y asistente de IA muestran `Profesion · especialidad` y el asistente entiende pedidos por profesion ("quiero un psicologo").

## TeamCategory

No se reutiliza: agrupa a cualquier miembro del personal por sede (`UserProfile.teamCategoryId`) como equipo de trabajo; no define la profesion de quien atiende.

## Datos de prueba

`prisma/test-seed-env-accounts.sql` agrega tres profesionales `seed_env_*` en MediGest Centro: psicologa (`psicologa.test@medigest.test`), kinesiologo (`kine.test@medigest.test`) y masoterapeuta con profesion propia (`maso.test@medigest.test`). Los doctores dentales de la siembra quedan como Odontologo/a. Clave: la de `docs/CUENTAS-DE-PRUEBA.md`.

## Nota de entorno

`prisma migrate deploy` falla en una base vacia porque `20260429180000_add_clinic_info_fields` y `20260515130000_clinic_branding` agregan ambas `Clinic.address`. Es un problema previo, no de esta migracion; en bases nuevas locales se uso `prisma db push`.
