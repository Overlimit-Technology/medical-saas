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

## Migración

`prisma/migrations/20261101120000_add_patient_portal` hace tres cambios:
- agrega `portalSlug` y `portalEnabled` a `ClinicSettings`;
- crea `PatientAccount`;
- crea `PatientPortalCode`.

**Hay que aplicarla en cada base antes de desplegar el código** (ver `docs/ENTORNOS.md`). Varias rutas existentes leen la fila completa de `ClinicSettings` y fallarían si la columna nueva no existe.

```bash
npx prisma migrate deploy
```

## Pendiente

- **Subdominios por clínica** (`revitamed.zensya.cl`). Falta un comodín DNS `*.zensya.cl` en Vercel y una regla en el middleware o en `next.config.mjs` que reescriba el host a `/portal/{enlace}`.
- **Recuperar la contraseña por correo.** Puede reutilizar `PatientPortalCode`.
- **Recetas, consentimientos y ejercicios.** Hoy no hay tablas para estos datos. Por eso no aparecen en el menú.
