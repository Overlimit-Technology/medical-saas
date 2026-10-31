# Portal del paciente

Cada sede tiene su propio portal en `/portal/{enlace}`, por ejemplo `/portal/revitamed`. El paciente entra con su RUT o su correo y una contraseña. El diseño sigue a zensya.cl: tema claro por defecto, modo oscuro opcional con el botón de arriba, Syne y Lexend y el logo de Zensya.

El prototipo original en un solo HTML sigue en [`prototipos/portal-paciente/index.html`](prototipos/portal-paciente/index.html), solo como referencia visual.

## Cómo se activa

1. Un administrador de la sede entra a **Portal paciente** en el menú lateral de la app (`/portal-paciente`).
2. Elige el enlace, por ejemplo `revitamed`, y activa el portal.
3. Comparte el enlace con sus pacientes.

## Cómo crea su cuenta el paciente

1. En `/portal/{enlace}/registro` escribe su RUT y su correo, y su nombre si es nuevo.
2. Recibe por correo un código de 6 números, que vence en 10 minutos.
   - **Si el RUT ya tiene ficha en la sede**, el código va al correo de la ficha y nunca a uno escrito en el formulario. Si la ficha no tiene correo, se le pide que lo registre en recepción.
   - **Si el RUT es nuevo**, se crea la ficha con los datos del formulario.
3. Escribe el código y crea su contraseña. La cuenta queda creada y entra de inmediato.

Límites del registro:
- máximo 5 intentos por código;
- máximo 3 códigos cada 10 minutos por RUT;
- límite por IP en ingreso y registro.

En la base de datos solo se guarda el hash del código y de la contraseña.

## Recuperar la contraseña

1. En `/portal/{enlace}/recuperar` (enlace "¿Olvidaste tu contraseña?" en el ingreso) el paciente escribe su RUT o su correo.
2. Si tiene cuenta, le llega un código de 6 números al correo de la cuenta. La pantalla dice lo mismo exista o no la cuenta, para no revelar quién tiene cuenta.
3. Escribe el código y su contraseña nueva. Queda guardada y entra de inmediato.

Usa los mismos límites que el registro. Los códigos llevan un propósito (`SIGNUP` o `RESET`) que también entra en el hash, así que un código de registro no sirve para cambiar una contraseña.

## Subdominios por clínica

Con la variable `PORTAL_ROOT_DOMAIN=zensya.cl`, `revitamed.zensya.cl` muestra el portal de la sede con enlace `revitamed`. El middleware reescribe `revitamed.zensya.cl/citas` a `/portal/revitamed/citas`. En un subdominio de portal la app del equipo no responde: cualquier ruta cae dentro del portal.

Para activarlo en producción:
1. En Vercel → proyecto → Settings → Domains, agrega `*.zensya.cl`. Vercel pide que el dominio use sus nameservers para emitir el certificado comodín.
2. En Vercel → Environment Variables (Production), agrega `PORTAL_ROOT_DOMAIN=zensya.cl` y vuelve a desplegar.

Sin la variable todo sigue funcionando por ruta (`app.zensya.cl/portal/revitamed`). Los subdominios `app`, `www`, `api`, `admin`, `staging`, `preview` y `dev` nunca son portales y no se pueden usar como enlace.

## Secciones

Cada sección es una página propia y el menú marca en cuál está el paciente.

| Ruta | Contenido | Datos |
|---|---|---|
| `/portal/{enlace}` | Próxima cita, pendientes, plan activo y últimas atenciones | `Appointment`, `TreatmentPlan`, `PaymentHistory`, `Patient` |
| `/reservar` | Profesional, día y hora. Usa el mismo motor que la reserva online | `BookingService` |
| `/citas` | Próximas y anteriores; confirmar y cancelar hasta 24 h antes | `Appointment` |
| `/tratamiento` | Planes, sesiones realizadas, faltas y la próxima | `TreatmentPlan` + citas del plan |
| `/historial` | Atenciones pasadas con filtro por especialidad | `Appointment` |
| `/documentos` | Exámenes e imágenes con su archivo | `PatientImaging` |
| `/pagos` | Pendiente, pagado y detalle | `PaymentHistory` |
| `/perfil` | Teléfono, dirección, contacto de emergencia y cambio de contraseña | `Patient`, `PatientAccount` |

## Seguridad

- **Sesión.** La sesión del paciente usa la cookie `zs_portal`. Es distinta de la del equipo (`mg_session`) y se firma con una llave derivada de `SESSION_SECRET`, así que una nunca sirve como la otra.
- **Acceso a datos.** Cada consulta filtra por la sede y por el paciente de la sesión.
- **Rutas.** Las del portal (`/portal/*` y `/api/portal/*`) son públicas en el middleware y cada una valida su propia sesión. La ruta del equipo `/portal-paciente` sigue protegida.

## Variables de entorno

No hay variables nuevas obligatorias. El portal usa las que ya existen:

| Variable | Uso |
|---|---|
| `SESSION_SECRET` | Firma de la sesión del paciente y de los códigos (con una llave derivada) |
| `GMAIL_USER`, `APP_PASSWORD_GMAIL` | Envío del código por correo |
| `PATIENT_PORTAL_SECRET` (opcional) | Si se define, reemplaza a `SESSION_SECRET` como base de la llave del portal |
| `PORTAL_ROOT_DOMAIN` (opcional) | Dominio de los subdominios de portal, por ejemplo `zensya.cl`. No es una clave |

## Migración

Son dos migraciones. `prisma/migrations/20261101120000_add_patient_portal` hace tres cambios:
- agrega `portalSlug` y `portalEnabled` a `ClinicSettings`;
- crea `PatientAccount`;
- crea `PatientPortalCode`.

`20261101130000_portal_code_purpose` agrega la columna `purpose` a `PatientPortalCode` para recuperar la contraseña.

**Hay que aplicarlas en cada base antes de desplegar el código** (ver `docs/ENTORNOS.md`). Varias rutas existentes leen la fila completa de `ClinicSettings` y fallarían si la columna nueva no existe.

```bash
npx prisma migrate deploy
```

## Pendiente

- **Subdominios en producción.** El código ya está. Falta el dominio comodín en Vercel y la variable `PORTAL_ROOT_DOMAIN` (ver arriba).
- **Cerrar otras sesiones al cambiar la contraseña.** La sesión es una cookie firmada de 7 días; hoy una sesión abierta en otro equipo sigue viva hasta que vence.
- **Recetas, consentimientos y ejercicios.** Hoy no hay tablas para estos datos. Por eso no aparecen en el menú.
