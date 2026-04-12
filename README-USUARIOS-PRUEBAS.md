# Usuarios Pruebas

Este archivo resume los usuarios de prueba definidos en [prisma/seed.ts](/abs/c:/Users/Mayisus/Documents/GitHub/medical-saas/prisma/seed.ts:1).

## Accesos principales

| Tipo | Email | Password |
| --- | --- | --- |
| Admin | `admin@medigest.cl` | `Admin123!` |
| Super Admin | `jeancarlosgarnicaflores@gmail.com` | `Jean1234x` |
| Doctor | `doctor@medigest.cl` | `Doctor123!` |
| Secretaria | `secretaria@medigest.cl` | `Secre123!` |

## Usuarios extra de prueba

| Tipo | Email | Password |
| --- | --- | --- |
| Doctor A | `doctor.A.multi.a@medigest.cl` | `Doctor123!` |
| Doctor B | `doctor.B.multi.b@medigest.cl` | `Doctor123!` |

## Nota

- En el seed actual, los usuarios `ADMIN` se crean con `isSuperAdmin = true`.
- Por eso `admin@medigest.cl` y `jeancarlosgarnicaflores@gmail.com` técnicamente quedan como super admin en base de datos.
- Si quieres, en el siguiente paso también te lo dejo reflejado dentro del `README.md` principal.
