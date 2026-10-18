# Cuentas de prueba y datos de ejemplo

Para Development, Preview y bases locales. **Nunca** para producción. Todos los datos son inventados.

## Clave

Todas las cuentas usan la misma clave. Está en el encabezado de `prisma/test-seed-current-month.sql` (línea "Password para todos los usuarios activos de este seed").

## Cuentas

| Rol | Correo | Sedes | Para probar |
|---|---|---|---|
| Doctor | `doctor.general.seed@medigest.test` | Centro | Voz a borrador en `/asistente-ia`, consulta, agenda propia |
| Doctor | `doctor.ortho.seed@medigest.test` | Centro | Segundo doctor (ortodoncia) |
| Doctor multi-sede | `doctor.multi.seed@medigest.test` | Centro y Norte | Cambio de sede |
| Secretaria | `secretaria.centro.seed@medigest.test` | Centro | Agenda, pacientes, CRM, caja, análisis de leads |
| Administrador de sede | `admin.sede.test@medigest.test` | Centro y Norte | Reserva online, boletas, configuración, usuarios |
| Administrador de una sede | `admin.centro.test@medigest.test` | Solo Centro | Aislamiento entre sedes |
| Super admin | `admin.seed@medigest.test` | Plataforma | Panel `/super-admin` (no entra a una sede) |

## Permisos de cada rol (igual que producción)

- Doctor: agenda, cita clínica, chat y tratamientos. No ve pacientes, usuarios ni boxes.
- Secretaria: agenda, pacientes, chat, bandeja Meta, CRM y usuarios.
- Administrador: todo en su sede.

## Cargar los datos

El comando carga clínicas, pacientes, citas y las cuentas de la tabla. Se puede repetir sin problema.

Contra la base a la que apunta tu `.env` (debe ser la rama `dev` de Neon o una base local):

```bash
npm run seed:test
```

Solo las cuentas adicionales (requiere haber cargado antes lo anterior):

```bash
npm run seed:test:accounts
```

Contra la rama `preview` de Neon (PowerShell):

```powershell
$env:DATABASE_URL = (npx neonctl@latest connection-string preview --project-id hidden-wildflower-22365167 --database-name neondb --role-name neondb_owner --ssl require); npm run seed:test; Remove-Item Env:DATABASE_URL
```

### Protección contra producción

Si la base destino tiene usuarios reales (ids que no empiezan con `seed_`), el script **aborta sin escribir nada** y muestra el motivo. Se comprobó contra producción. `--force` lo salta; úsalo solo en una base de pruebas con otros usuarios:

```bash
npm run seed:test -- --force
```

## Probar la IA en local

1. Verifica que tu `.env` apunte a `dev` (no a producción) y tenga `GEMINI_API_KEY`.
2. `npm run dev` y abre http://localhost:3000.
3. Entra como doctor para voz a borrador. Entra como administrador de sede para activar la reserva online en Configuración > Contactabilidad y CRM > Reserva online, y copia el enlace público.

El inbox del CRM necesita MongoDB; en `dev` usa una base vacía.

## Advertencias

- La clave es conocida: activa la protección de despliegues de Vercel en Preview.
- No pongas datos reales de pacientes en estos entornos ni en el plan gratuito de Gemini.
