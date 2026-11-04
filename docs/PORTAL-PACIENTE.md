# Portal del paciente (prototipo)

Prototipo navegable en un solo HTML: [`prototipos/portal-paciente/index.html`](prototipos/portal-paciente/index.html). Se abre directo en el navegador, sin instalar nada. Todos los datos son ficticios.

Usa el sistema visual de zensya.cl (turquesa `#50c9d5`, Syne y Lexend, tarjetas glass, botones píldora), con el blanco como color principal y modo claro y oscuro. La app usa otro sistema (Geist, `#19b3bc`): antes de pasarlo a Next.js hay que decidir cuál manda en el portal.

## Estructura

- **Barra superior** con la clínica, ayuda, tema, notificaciones y perfil.
- **Menú lateral** en tres grupos. En el celular se reemplaza por una barra inferior con Reservar al centro.
  - Mi atención: Inicio, Reservar hora y Mis citas.
  - Mi salud: Mi tratamiento, Ejercicios e Historial clínico.
  - Trámites: Documentos y Pagos.
  - Abajo: Mi perfil y Cerrar sesión.
- **Ingreso** con RUT y contraseña o con código por WhatsApp. Las cuentas se activan con el RUT, sin un registro largo.

## Qué hace cada sección

| Sección | Contenido |
|---|---|
| Inicio | Próxima cita con confirmación, lista "Por hacer", ejercicios del día, avance del tratamiento, documentos y equipo de salud |
| Reservar hora | Especialidad, profesional, fecha y hora, y confirmación, con un resumen al lado |
| Mis citas | Próximas y anteriores; confirmar, cambiar hora y cancelar |
| Mi tratamiento | Sesiones del plan, dolor por sesión (escala EVA), objetivos y notas de cada sesión |
| Ejercicios | Rutina del día, semana, instrucciones y registro de dolor al terminar |
| Historial clínico | Atenciones, recetas, exámenes y derivaciones, con filtro por especialidad y aviso de las Leyes 19.628 y 20.584 |
| Documentos | Consentimientos por firmar, formularios, carga de archivos y descargas |
| Pagos | Saldo pendiente y boletas |
| Mi perfil | Datos personales, previsión, contacto, contacto de emergencia y avisos |

## Pendiente para la versión real

- Pago en línea, videollamada, mapa y descargas: en el prototipo solo muestran un aviso.
- Política de cancelación, sedes, precios y teléfonos: hay que tomarlos de la configuración de cada clínica.
