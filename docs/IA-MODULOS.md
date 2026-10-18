# Modulos de IA de MediGest (prototipo)

Estado: los 4 modulos acordados estan construidos y probados con Gemini real en la base local de pruebas. Es un prototipo: usa el plan gratuito de Gemini, asi que **solo datos inventados**.

## Antes de usar (una vez)

1. `GEMINI_API_KEY` en el `.env` (ver [IA-PROTOTIPO.md](IA-PROTOTIPO.md)).
2. Aplicar las 3 migraciones nuevas y regenerar Prisma:

```bash
npx prisma migrate deploy
npx prisma generate
```

| Migracion | Para que |
|---|---|
| `20261015120000_add_professional_invoices` | Boletas de honorarios |
| `20261016120000_add_lead_ai_score` | Analisis IA de leads |
| `20261017120000_add_online_booking` | Reserva online |

3. Reiniciar `npm run dev`. Si no se reinicia despues de `prisma generate`, el servidor sigue usando el cliente viejo y falla con "Unknown argument".

## Resumen

| Modulo | Donde | Quien lo usa | IA |
|---|---|---|---|
| Voz a borrador | `/asistente-ia` | DOCTOR | Transcribe el audio y redacta la evolucion |
| Respuestas sugeridas | Inbox del CRM, boton "Sugerir con IA" | ADMIN, SECRETARY | Redacta una respuesta que un humano revisa |
| Analisis de leads | Detalle de lead y etiqueta en la tarjeta | ADMIN, SECRETARY | Puntaje 0-100, temperatura y siguiente paso |
| Reserva online | `/reservar/{llave}` (publica) y Configuracion > Reserva online | Pacientes y ADMIN | Interpreta el pedido y propone horas reales |

## Principios comunes

- La IA nunca ejecuta acciones: propone y una persona confirma (enviar, reservar, usar el borrador).
- Los datos de pacientes no viajan a la IA. Se ocultan RUT, correos y telefonos evidentes antes de enviar texto.
- Los mensajes de usuarios se tratan como datos: el prompt ignora instrucciones dentro de ellos (probado).
- Todo valida el resultado del modelo contra datos reales antes de usarlo (doctores, fechas, horas).
- Los endpoints de IA con sesion exigen rol con `requireRole(session.role, [...])` de 2 argumentos. Ojo: el formato de 3 argumentos tiene el bug A-01 y no filtra por rol.

## 1. Voz a borrador

- Grabar (hasta 2 minutos) o subir audio. API: `POST /api/ai/voice-draft` (solo DOCTOR, 8 por minuto).
- Un solo llamado a Gemini transcribe y estructura. Reemplaza nombres, RUT y telefonos dictados por `[NOMBRE]` y `[DATO]`.
- No inventa diagnosticos: si el doctor no lo dicta, queda "Completalo tu".
- Probado con audio sintetico: transcripcion correcta, 3,2 s de respuesta.
- No probado: grabacion real con micrófono del navegador (el panel de pruebas no tiene microfono).

## 2. Respuestas sugeridas en el inbox

- `POST /api/ai/suggest-reply` toma los ultimos 12 mensajes de la conversacion, datos publicos de la sede (horario, direccion, precios) y devuelve respuesta, intencion y si requiere humano.
- Deriva a un humano ante sintomas, urgencias y reclamos. No confirma horas ni da consejo medico.
- Cambios en archivos con trabajo sin commitear del equipo: `CrmInbox.tsx` (boton) y `MetaChatService.ts` (metodo `getRecentTurnsForAi`).
- Probado el servicio con Gemini real en 6 casos (precio, horario, agendar, clinico, inyeccion, reclamo). No probado el inbox completo: requiere MongoDB, desactivado en el servidor de pruebas.

## 3. Analisis de leads

- `POST /api/ai/score-lead` guarda `aiScore`, `aiTemperature`, `aiSummary`, `aiNextAction` y `aiScoredAt` en el lead.
- Temperatura segun el puntaje: 70 o mas caliente, 40 a 69 tibio, menos de 40 frio.
- No envia nombre, telefono, correo ni empresa del lead.
- Probado: aislamiento entre sedes, rol, persistencia y que el pipeline devuelva los campos nuevos.

## 4. Reserva online con asistente

Flujo: el paciente abre el enlace de la sede, cuenta que necesita (o elige a mano), ve horas reales, llena sus datos y confirma. La cita queda `SCHEDULED` con la nota "Reserva online. Pendiente de confirmacion" y recepcion recibe una alerta.

| Ruta publica | Funcion |
|---|---|
| `GET /api/public/booking/{llave}/info` | Datos publicos de la sede y profesionales (sin correos) |
| `GET /api/public/booking/{llave}/slots` | Horas libres calculadas con la agenda real |
| `POST /api/public/booking/{llave}/book` | Crea la reserva |
| `POST /api/public/booking/{llave}/assistant` | Interpreta el pedido y propone horas |

Activacion: Configuracion > Contactabilidad y CRM > Reserva online (activar, duracion de cada hora, enlace).

Protecciones probadas:

| Caso | Resultado |
|---|---|
| RUN con digito verificador invalido | Rechazado |
| Campo trampa para bots lleno | Rechazado con error generico |
| Sin consentimiento | Rechazado |
| 6 reservas simultaneas a la misma hora | Exactamente 1 exitosa |
| Mas de 5 reservas por IP en 10 minutos | 429 |
| Llave inexistente | 404 |
| Paciente existente reserva con su RUN | No se modifica ningun dato suyo |
| Asistente con intento de manipulacion | Ignorado, no reserva ni entrega datos |
| Sintomas o urgencia en el chat | Deriva a la clinica |

Limitaciones conocidas:

- Los limites por IP viven en memoria: con varias instancias necesitan un almacen compartido. Detras de un proxy hay que confiar en el `x-forwarded-for` que agrega la infraestructura.
- Alguien puede agendar una cita en la ficha de otra persona si conoce su RUN. Mitigacion actual: queda pendiente de confirmacion y recepcion llama. Mejora sugerida: codigo por SMS o correo.
- No hay cancelacion por el paciente ni recordatorio propio de este flujo.
- Las vacaciones aprobadas no bloquean horas (igual que en la agenda interna, hallazgo B-11).
- Dias de atencion fijos de lunes a sabado, con el horario de la sede.
- Los pacientes de prueba sembrados tienen RUN con digito invalido y no pueden reservar en linea.
- Falta aviso legal propio (politica de privacidad enlazada en la pagina) antes de publicar. Ver [FICHA-PRODUCTO-PRIVACIDAD.md](FICHA-PRODUCTO-PRIVACIDAD.md).
- La pagina publica no se probo en celular; el diseno es responsive.

## Datos de prueba que quedaron en la base local

Citas y pacientes creados por las pruebas de reserva ("Conc..." , "Prueba Inventada", "Laura Prueba Web"), 10 pagos `PAID` con notas "QA boletas", boletas de ejemplo de mayo 2026, un lead analizado y la reserva online activada en MediGest Centro. Para restaurar la base: `npm run db:seed`.

## Pendiente

- Probar voz con microfono real y afinar el prompt con 30 a 50 notas inventadas.
- Enlaces en el menu lateral para `/asistente-ia`, `/mis-boletas`.
- Para produccion: adaptador de Claude (Haiku 5.5), tope de gasto, politica de privacidad enlazada y revision legal (Ley 21.719).
- Corregir los hallazgos de seguridad A-01 a A-06 del reporte QA antes de abrir nada al publico.
