# Correos del sistema (ZENSYA / MediGest)

Todos los correos se construyen con **React Email** (`src/emails/`) y se envian con `deliverEmail`
(`src/server/notifications/mailer.ts`, Gmail por SMTP con TLS `rejectUnauthorized: true`).

## Inventario

| # | Correo | Evento (`EmailTemplateType`) | Quien lo dispara | Destinatario | Editable por la clinica |
|---|--------|------------------------------|------------------|--------------|-------------------------|
| 1 | Confirmacion de cita | `APPOINTMENT_CONFIRMATION` | `POST /api/appointments` (agenda interna) y `notifyOnlineBooking` (reserva online `/reservar/...`) | Paciente | Si |
| 2 | Recordatorio de cita | `APPOINTMENT_REMINDER` | `GET /api/cron/appointment-reminders` (cron, 24 h antes) | Paciente | Si |
| 3 | Cancelacion de cita | `APPOINTMENT_CANCELLATION` | `DELETE /api/appointments/[id]` (cancelada por la clinica) | Paciente | Si |
| 4 | Bienvenida paciente | `PATIENT_WELCOME` | `POST /api/patients` | Paciente | Si |
| 5 | Bienvenida usuario (clave temporal) | `USER_WELCOME` | `POST /api/users` y `POST /api/doctors` | Profesional / secretaria / admin nuevo | Si |
| 6 | Actualizacion de pago | `PAYMENT_UPDATE` | `POST /api/crm/payment-history` | Paciente | Si |
| 7 | Liquidacion mensual | `PROFESSIONAL_PAYOUT` | `ProfessionalPayoutsService.sendMonthlyPayoutEmails` | Profesional | Si (si la clinica no la edita, se usa el correo con tabla de montos y boton "Generar mi boleta") |
| 8 | Alerta interna | `INTERNAL_ALERT` | `InternalAlertsService.createAndDispatch` | Personal interno de la sede | Si |
| 9 | Correo manual | (sin plantilla) | `POST /api/email/send` (solo rol ADMIN, 10 envios/min por usuario) | Cualquier correo indicado por el ADMIN | No (se envuelve en el layout comun) |

Notas del inventario:

- No existe hoy correo de recuperacion/cambio de clave: `/change-password` no envia correo. La clave temporal solo viaja en el correo #5.
- No hay correo de invitaciones ni de boletas aparte de la liquidacion (#7), que enlaza a `/mis-boletas`.
- Unico punto de salida SMTP: `deliverEmail` (`nodemailer.createTransport` solo aparece en `mailer.ts`). El resto pasa por `sendEmail` (`email.ts`), que agrega la version de texto plano si solo viene HTML.

## Arquitectura

```
resolveEmailTemplate()  -> plantilla de la clinica o por defecto (DEFAULT_TEMPLATES)
  buildTemplateContent() -> interpola {{variables}} (escape de HTML) y sanea el HTML de la plantilla
  TemplateEmail          -> componente React Email dentro de EmailLayout
  renderEmail()          -> { html, text } con @react-email/render
sendEmail() -> deliverEmail() -> Gmail SMTP
```

- `src/emails/EmailLayout.tsx`: 600 px, encabezado turquesa `#19b3bc` con ZENSYA y nombre de la sede, pie con aviso de "no responder" y privacidad (Leyes 19.628, 20.584 y 21.719), modo oscuro (`prefers-color-scheme`), idioma `es`.
- `src/emails/parts.tsx`: titulo, parrafo, tarjeta de detalles, boton CTA.
- `src/emails/TemplateEmail.tsx`: un componente por tipo editable (titulo, vista previa y pie propios).
- `src/emails/ProfessionalPayoutEmail.tsx` y `src/emails/ManualEmail.tsx`: correos con estructura propia.
- `src/emails/templateContent.ts`: `escapeHtml`, `sanitizeEmailHtml`, interpolacion segura.
- `src/emails/registry.tsx`: ejemplos de todos los correos (preview y pruebas).

Seguridad: los valores de variables (nombres de paciente, motivo, etc.) se escapan al insertarse en HTML; el asunto se fuerza a una linea. El HTML de la plantilla se sanea (script, iframe, `on*`, `javascript:`) antes de insertar variables. El HTML de un correo manual tambien se sanea. No se incorporo ningun dato nuevo: cada correo lleva lo mismo que antes (minimo necesario).

Marca de la clinica: se muestra el nombre de la sede en el encabezado. El logo (`ClinicSettings.logoBase64` / `Clinic.logo`) no se incrusta porque Gmail y Outlook bloquean imagenes `data:`; requiere una URL publica estable (pendiente).

## Previsualizar y probar

- `npm run emails:preview`: escribe HTML y texto de cada correo en `.email-preview/` (ignorado por git); abrir `.email-preview/index.html`.
- `npx next dev -p 3022` y abrir `/api/dev/email-preview` (indice) o `/api/dev/email-preview?tipo=user-welcome` (`&formato=texto` para la version de texto). En produccion responde 404 salvo super admin.
- `npm run test:emails`: renderizado de todos los correos, escape de `<script>` en nombres, saneado de HTML.
- `MAIL_DRY_RUN=1`: `deliverEmail` no envia; guarda el correo en `.email-outbox/` (ignorado por git) y lo informa en consola.

Capturas de revision (escritorio 600 px, movil 375 px y modo oscuro): `docs/correos-previews/`.
