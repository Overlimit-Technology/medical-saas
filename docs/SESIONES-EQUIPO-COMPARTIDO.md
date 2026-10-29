# Sesiones multiples en equipos compartidos

Permite que varios profesionales usen el mismo computador por turnos y cambien de sesion con un clic, sin cerrar y abrir sesion cada vez. Es **opt-in** y esta **apagado por defecto**: si nadie lo activa, el inicio y cierre de sesion se comportan exactamente como antes.

## Como se activa (dos llaves)

1. **Sede (ADMIN)**: Configuracion > Seguridad de acceso. Flag `ClinicSettings.sharedSessionsEnabled` con aviso de riesgo y confirmacion. API: `GET/PATCH /api/clinic-settings/shared-sessions` (solo rol ADMIN).
2. **Equipo (cualquier usuario no super admin de la sede)**: menu lateral > "Compartir este equipo". Modal con aviso de riesgos, casilla "entiendo y acepto" y reingreso de la contrasena. Queda en auditoria (`SESION_COMPARTIDA_ACTIVADA`).

## Parametros (por sede)

| Parametro | Campo | Default | Limites |
|---|---|---|---|
| Minutos de inactividad para bloquear | `sharedIdleLockMinutes` | 10 | 2 a 60 |
| Horas maximas sin reingresar la contrasena | `sharedMaxHoursWithoutPassword` | 8 | 1 a 12 |

Constantes en `src/server/auth/sharedDevice.ts`: maximo 6 perfiles por equipo, cookie de equipo valida 30 dias, 5 intentos fallidos de contrasena por cuenta cada 10 minutos.

## Mecanica

- `mg_session` sigue siendo la **unica sesion viva** (perfil activo). El middleware no cambia.
- `mg_device` (httpOnly, firmada con `SESSION_SECRET`, sameSite lax, secure en produccion) guarda solo la lista de perfiles estacionados: `{userId, nombre visible, rol, lastAuthAt}` y la sede. No contiene credenciales ni permisos (menos de 1 KB con 6 perfiles).
- En cada cambio la sesion se **reconstruye desde la BD** (rol y permisos actuales, no los de la cookie).
- La vigencia de `mg_session` en modo compartido es `min(8 h, lastAuthAt + horasMaximas)`: aunque el navegador quede abierto, la sesion expira y exige contrasena.
- Un equipo pertenece a **una sede** (la de quien lo activa). Solo se agregan usuarios con membresia ACTIVE en esa sede. Super admins quedan excluidos.

### Endpoints

| Endpoint | Funcion |
|---|---|
| `GET /api/auth/device` | Estado del equipo. Sin sesion (pantalla de bloqueo) solo devuelve nombre y rol de los perfiles. |
| `POST /api/auth/device` | Activa el equipo ({password, accept:true}). |
| `DELETE /api/auth/device` | Quita el modo compartido y descarta los perfiles estacionados (conserva la sesion actual). |
| `POST /api/auth/device/add` | Inicio de sesion completo de otro profesional; lo suma y pasa a ser el activo. |
| `POST /api/auth/switch` | Cambia de perfil. |
| `POST /api/auth/device/lock` | Bloquea la pantalla (elimina `mg_session`; el perfil bloqueado queda con `lastAuthAt = 0`). |
| `POST /api/auth/logout` | Con equipo compartido cierra solo **mi** sesion; con `scope=all` cierra todas y borra `mg_device`. Sin equipo compartido: comportamiento original. |

### Reglas del cambio (`/api/auth/switch`)

Cambio **sin contrasena** solo si se cumplen todas:
1. El equipo esta en modo compartido y la sede sigue habilitandolo (se consulta la BD en cada llamada; si no, se borra `mg_device`).
2. Quien llama tiene una sesion vigente que es de un perfil de este equipo (en la pantalla de bloqueo siempre se exige contrasena).
3. El perfil destino ingreso su contrasena hace menos de las horas configuradas.
4. El rol real del destino (BD) no es ADMIN: los administradores de sede **siempre** reingresan contrasena.

En todo cambio se revalida en BD: usuario `ACTIVE` (no SUSPENDED/PENDING), sin `mustChangePassword` pendiente, membresia ACTIVE en la sede del equipo y no super admin. Si falla, el perfil se retira del equipo y se audita (`SESION_COMPARTIDA_RECHAZADA`).

## UI

- Menu lateral (pie): "Compartir este equipo" o selector "Cambiar de usuario" con perfiles, "Agregar otro profesional", "Bloquear pantalla", "Cerrar mi sesion", "Cerrar todas las sesiones" y "Desactivar modo compartido". Aparece solo si la sede lo habilito.
- Cada cambio hace **recarga completa** (`window.location.assign("/")`) para reiniciar el estado del cliente y no mostrar datos de un perfil a otro.
- Bloqueo por inactividad: temporizador en el cliente (mousemove, teclado, scroll, tactil; sincronizado entre pestanas con `localStorage`). Al vencer llama a `/api/auth/device/lock?reason=idle` y se muestra la pantalla de bloqueo en `/login` (`SharedDeviceLock`), que pide la contrasena del perfil elegido.

## Auditoria (`AuditLog`)

`SESION_COMPARTIDA_ACTIVADA`, `_AGREGADA`, `_CAMBIO` (indica si fue con o sin contrasena y desde quien), `_BLOQUEO` (manual/inactividad), `_CIERRE`, `_CIERRE_TOTAL`, `_DESACTIVADA`, `_RECHAZADA`, `_CONFIG` (cambios de la sede) y `_CLAVE_FALLIDA`.

## Amenazas y mitigaciones

| Amenaza | Mitigacion |
|---|---|
| Robo de la cookie `mg_device` | Es httpOnly y firmada; no contiene credenciales ni tokens de sesion. Por si sola no inicia sesion: el cambio sin contrasena exige ademas una `mg_session` vigente de un perfil del equipo. Alterarla invalida la firma. Residual: quien robe **ambas** cookies puede cambiar sin clave dentro de la ventana (excepto a ADMIN); acotado por la ventana y el maximo de 6 perfiles. |
| Robo de `mg_session` | Igual que antes de esta funcion, pero su expiracion queda acotada a la ventana de contrasena. |
| Pantalla desatendida | Bloqueo por inactividad (default 10 min), "Bloquear pantalla" manual y vigencia de sesion acotada. Residual: el temporizador es del cliente; entre la ultima actividad y el bloqueo la pantalla esta abierta. Un atacante con control del navegador puede inhibirlo, pero la sesion igual expira por la ventana. |
| Cambio a un perfil de alguien que ya no debe acceder (suspendido, pendiente, sacado de la sede) | Revalidacion en BD en cada cambio; el perfil se retira y se audita. |
| Fuerza bruta de contrasena en el cambio | 5 fallos por cuenta en 10 minutos bloquean (429), contados desde `AuditLog` (vale entre instancias serverless). |
| Escalada a administrador | ADMIN siempre pide contrasena; rol y permisos se leen de la BD. |
| Acceso a otra sede | Un equipo esta atado a una sede; usuarios sin membresia ACTIVE en ella son rechazados aun con contrasena correcta. |
| Fuga de datos en pantalla entre perfiles | Recarga completa tras cada cambio; la lista solo muestra nombre y rol. |
| Equipo personal o publico | Activacion explicita con aviso y aceptacion; el admin puede deshabilitar la funcion y los equipos dejan de funcionar en su proxima accion. |
| Deshabilitar el modo | Al desactivarlo en el equipo se descartan los perfiles estacionados; si la sede lo deshabilita, el siguiente uso borra `mg_device`. |

## Limitaciones conocidas

- La lista de perfiles vive en el navegador (no hay registro de equipos en el servidor), por lo que no se puede "cerrar a distancia" un equipo concreto; la ventana de contrasena y la deshabilitacion por sede lo cubren.
- El nombre y rol de los perfiles se muestran en la pantalla de bloqueo a quien tenga el equipo (necesario para elegir perfil).
- El rate limit se basa en `AuditLog`; limpiar esa tabla lo reinicia.

## Pruebas

Se probo por HTTP (72 verificaciones): modo apagado sin cambios, permisos del admin, activacion, 3 perfiles, cambio dentro y fuera de ventana, clave incorrecta, rate limit, suspendido y usuario de otra sede, cookie alterada, bloqueo, cierre propio vs todas, desactivacion y auditoria.
