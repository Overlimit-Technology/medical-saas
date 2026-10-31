# Flujo SaaS: rediseño con el estilo del portal del paciente

Fuente: sección "flujo saas" del tablero de Miro del equipo. Rama: `jorge/rediseno-estilo-portal`, creada desde `feat/portal-paciente`.

## Sistema visual (el del portal del paciente)

El sistema completo está en la skill `zensya-diseno` (`references/portal-paciente.md`). Lo que se aplicó a la app del equipo:

| Elemento | Valor |
|---|---|
| Fondo | `#f4f7f9`. Tarjetas blancas con borde `#dce3e8`, radio de 24px y sombra casi imperceptible |
| Acento | Turquesa `#50c9d5` (antes `#19b3bc`). Texto chico turquesa en `#1e737b`. Sobre botones turquesa, el texto va oscuro `#080b04` |
| Grises | Paleta `slate` de Tailwind reemplazada por los grises azulados del portal (`tailwind.config.ts`) |
| Tipografía | Syne para títulos (h1 a h3, letter-spacing negativo) y Lexend para el texto (`src/app/layout.tsx`, `globals.css`) |
| Botones | Píldora de 48px (38px en tamaño `sm`): principal, `quiet`, `ghost` y `danger` |
| Estados | Píldora con punto: `ok` turquesa, `warn` ámbar (pendiente), `off` gris y `err` rojo |
| Navegación | Menú lateral claro con grupos (Mi día, Pacientes, Gestión). El ítem activo lleva fondo turquesa suave y el ícono en cuadro turquesa |
| Vacío, carga y error | Logo de Zensya con una frase; spinner turquesa; aviso rojo suave con la acción para reintentar |

Componentes compartidos: `src/presentation/ui/zs.tsx`:
- `PageHead`, `Tag`, `View`;
- `Card`, `Stat`, `StatusPill`, `IconBox`, `Segmented`;
- `EmptyState`, `Loading`, `Notice`;
- `btnClass` y las clases `zs`.

También `src/presentation/ui/OptionFinder.tsx`, un buscador de opciones.

## Checklist

Estados: **Hecho** · **Parcial** (se hizo una parte y se dice qué falta) · **Pendiente** (falta definir algo, ver dudas) · **Asignado a otra persona**.

### Admin

| # | Requerimiento (nota del tablero) | Estado | Dónde |
|---|---|---|---|
| 1 | Mantener el diseño SaaS del admin y sumar las cifras importantes de la demo | Hecho | Vista general (`/clinic-dashboard`): citas de hoy, pacientes, leads nuevos, ingresos del mes, citas de la semana, estado de las citas, agenda de hoy y ocupación por profesional. API `GET /api/dashboard/clinic-overview` (solo ADMIN) |
| 2 | Mejorar el diseño de configuración para que sea más intuitivo buscar opciones | Hecho | Buscador de opciones en Configuración y en Mi clínica |
| 3 | Optimizar la barra lateral con mejores secciones y permisos | Hecho | Grupos Mi día, Pacientes y Gestión, con el mismo filtro de permisos de antes. "Mi clínica" pasa a `/clinic-dashboard/clinica` |
| 4 | El diseño del calendario se mantiene | Hecho | Solo cambió la base (fuentes y colores) |
| 5 | Centro de notificaciones: alertas importantes arriba (por ejemplo revisiones de máquinas), menos texto plano y ancho completo | Hecho | Alertas importantes (mantenciones, choques, llegadas, cobros y cancelaciones) en tarjetas arriba; cifras; feed a ancho completo |
| 6 | Se mantiene el chat interno | Hecho | Sin cambios de estructura |
| 7 | Contactabilidad: menos texto y más intuitivo | Hecho | Ver #19 |
| 8 | Mejorar todo el diseño de la configuración de la clínica | Hecho | Mi clínica: buscador agrupado (Atención, Equipo, Pacientes, Comunicación) y el perfil de la clínica |
| 9 | Historial paciente: ancho completo y "Ver completo" visible desde el inicio | Hecho | |

### Doctor

| # | Requerimiento | Estado | Dónde |
|---|---|---|---|
| 10 | Seguimiento: ocupar todo el espacio y, al hacer clic en un paciente, ver algo como el portal (ejercicios, etc.) | Parcial | Ancho completo; una tarjeta por paciente; panel con planes, barra de sesiones, tratamientos y pagos. **Falta "ejercicios"**: no existe esa tabla |
| 11 | Mejorar el punto de cierre | Hecho | Anillo de avance; lo que falta va primero, con botón "Completar" |
| 12 | Mejorar las citas clínicas con las próximas citas y lo reciente | Hecho | Próximas citas con bloque de fecha y botón "Atender"; actividad reciente con el paciente y la fecha de la cita |
| 13 | Llevar los apartados personales a Mi perfil | Hecho | `/profile`: Mis datos, Vacaciones, Mi boleta (profesionales) y Liquidaciones. `/mis-boletas` redirige ahí y conserva `?month=` |
| 14 | Kinesiología: sala virtual con avatares, PIN y bloqueo automático, EVA con gráfico, mapa corporal, rangos de movimiento y ejercicios con video | Pendiente | Módulo clínico nuevo, ver dudas |
| 15 | Psicología: notas SOAP o libres, grabación con transcripción IA, PHQ-9 y GAD-7 con gráfico, notas privadas | Pendiente | Módulo clínico nuevo; requiere el consentimiento de la Ley 20.584 |
| 16 | Medicina general: signos vitales, CIE-10, receta, licencia, órdenes de exámenes y alertas de alergias | Pendiente | Parte de esto ya existe en la consulta guiada; falta definir qué es nuevo |
| 17 | Nutrición, terapia ocupacional, matrona y dermatología/estética | Pendiente | Módulos nuevos (ver el tablero) |
| 18 | Motivo de consulta antes de la cita que precargue el módulo de la especialidad | Pendiente | Depende de #14 a #17 |

### Configuraciones

| # | Requerimiento | Estado | Dónde |
|---|---|---|---|
| 19 | Cambiar el panel de correos y mensajes por algo fácil de entender, como los triggers de n8n | Hecho | Cada aviso es una regla "Cuando → Enviar correo a", con interruptor y botón Mensaje |
| 20 | Lo mismo en los links de reserva | Parcial | La pestaña Reserva online usa la base nueva, pero no se rehízo como regla |
| 21 | Mini mapa de la clínica, personalizable, con figuras y los boxes con sus nombres | Hecho | Boxes → Mapa: grilla de 24×16, boxes y áreas que se arrastran y cambian de tamaño. `ClinicSettings.clinicMap` |
| 22 | Servicios con sus códigos de venta Fonasa | Hecho | Columna `Treatment.fonasaCode`, selector con los 26 códigos del tablero o uno propio, y búsqueda por código |
| 23 | Agregar todos los códigos de Fonasa | Parcial | Están kinesiología, atención integral, terapia ocupacional y telerehabilitación. Para las demás especialidades hay que sumarlas en `src/lib/fonasa.ts` |
| 24 | Mejorar el diseño de usuarios y tener equipos de trabajo | Hecho | Usuarios → Equipos de trabajo, con sus integrantes |
| 25 | Vacaciones: buen panel, falta mejorar el diseño | Hecho | Solicitudes por aprobar primero; uso de días por profesional |
| 26 | Liquidaciones: mantener | Hecho | Solo cambió la base |

### Secretaria

No hay notas propias en el flujo. Usa la base nueva y el encabezado de Recepción con el estilo del portal.

### CRM (asignado a otra persona)

| # | Requerimiento | Estado |
|---|---|---|
| 27 | Mejorar la caja: arqueo, convenios, pagos rápidos e integración con máquinas POS | Asignado a otra persona ("CRM PENDIENTE PABLO") |
| 28 | Chat unificado que convierta conversaciones en clientes del pipeline | Asignado a otra persona ("CRM PENDIENTE PABLO") |

## Base de datos

Hay tres migraciones nuevas en esta rama, además de las dos del portal del paciente. Hay que aplicarlas antes de desplegar:

- `20261101140000_treatment_fonasa_code`: agrega `Treatment.fonasaCode`;
- `20261101150000_clinic_map`: agrega `ClinicSettings.clinicMap`.

```bash
npx prisma migrate deploy
```

## Inconsistencias y dudas

1. **Seguimiento y permisos.** La pantalla deja entrar a ADMIN y DOCTOR, pero `GET /api/seguimiento` exige el permiso `TREATMENTS`. Un profesional sin ese permiso entra y ve "Acceso denegado". No se cambió, porque toca permisos. ¿El profesional debería tener `TREATMENTS` por defecto, o la pantalla debería ocultarse?
2. **Panel del paciente en Seguimiento.** Los planes salen de `/api/treatment-plans`, que pide `AGENDA` o `CLINICAL_VISITS`. Sin esos permisos, el panel muestra tratamientos y pagos, pero no planes.
3. **Ejercicios del paciente** (#10 y #14): no hay datos de ejercicios en el sistema. Hay que definir cómo se cargan (¿video, repeticiones, frecuencia?) y si el paciente los ve en su portal.
4. **Módulos por especialidad** (#14 a #18): son productos nuevos, no rediseños. Antes de construirlos hay que definir la prioridad y quién valida lo clínico. Las grabaciones de psicología necesitan consentimiento explícito y almacenamiento cifrado (Ley 20.584).
5. **Modo oscuro en la app del equipo.** El portal lo tiene como opción. La app del equipo quedó solo en claro (que es el principal), porque varias pantallas tienen colores fijos. ¿Se quiere el botón de oscuro también acá?
6. **Pestañas "Próximamente" en Seguimiento** (Medicación, Servicios, Métricas y Pagos): se sacaron porque no tenían contenido. Si se quieren, hay que definir qué muestran.
7. **Mi clínica y Vista general.** Antes eran la misma pantalla para el admin. Ahora la Vista general tiene las cifras y Mi clínica la configuración. ¿Está bien así?
8. **Códigos Fonasa por sede.** Los servicios (`Treatment`) son globales, no por sede, así que el código Fonasa también es global.
9. **Campos negros.** En Windows con tema oscuro, los campos sin color propio se veían negros (por ejemplo "Iniciar cita clínica"). Se corrigió en la base (`globals.css`).

## Cómo se probó

- `tsc` y `next lint` pasan sin errores, y el build de producción compila.
- Se probó en una base temporal con un admin, una secretaria y un profesional de prueba. Se revisaron capturas en Edge headless de:
  - Vista general, Mi clínica y Configuración;
  - correos, servicios, Boxes y mapa;
  - Usuarios, Vacaciones y Notificaciones;
  - Historial, Mi perfil, Seguimiento y Recepción.

  Ninguna tuvo errores de JavaScript ni scroll horizontal a 1440px.
- Mapa: se agregó un box y un área, se arrastró la figura, se guardó y se recargó. Un box de otra sede se rechaza con un 400.
- No se probó: el celular en la app del equipo, Cita clínica con un profesional que tenga el permiso `CLINICAL_VISITS`, ni la agenda.
