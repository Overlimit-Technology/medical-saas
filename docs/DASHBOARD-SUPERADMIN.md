# Dashboard del super admin

Pagina inicial `/super-admin`. Reemplaza al antiguo "Overview" (solo mostraba cantidad de clinicas, pacientes y usuarios).
Solo para `isSuperAdmin`: la pagina redirige a `/dashboard` a cualquier otro rol y todas las rutas de API responden
401 sin sesion y 403 a un admin de sede, doctor o secretaria.

Todo lo que se muestra sale de la base de datos; no hay cifras escritas a mano.

## Que muestra

**Indicadores (arriba)**

| Grupo | Indicadores |
|---|---|
| Dinero | MRR (con variacion vs mes anterior), ARR, ingreso por sede (ARPA entre las que pagan y promedio entre todas las del filtro), margen del mes |
| Clientes | Churn del mes (y altas/bajas del rango), morosas e ingreso en riesgo, sedes en prueba y las que vencen en 7 dias, sedes sin acceso y canceladas |
| Uso | Citas del mes (sin canceladas), pacientes nuevos y totales, usuarios (sin contar super admin) y usuarios que entraron en 30 dias |

**Graficas** (SVG propio, sin librerias): ingresos/costos/margen por mes (linea), altas y bajas por mes (barras),
crecimiento del MRR y churn (linea), citas y pacientes nuevos por mes (barras), sedes por estado comercial (donut) y MRR por
plan (donut). Todas tienen tooltip al pasar el mouse y leyenda clicable (oculta o muestra una serie). En los donuts,
hacer clic en un segmento aplica ese estado o plan como filtro.

**Rankings**: top por ingreso, top por uso (citas del mes) y pruebas por vencer. Cada fila abre el detalle de la sede.

**Tabla de sedes**: ordenable por columna, con menu de acciones por fila y panel lateral de detalle.

## Filtros

Rango (3, 6 o 12 meses), plan, estado comercial (en prueba, activa, morosa, cancelada, o "sin acceso" = suspendida),
ciudad (la base no tiene region) y busqueda por nombre (sin distinguir mayusculas ni tildes). Actualizan indicadores,
graficas, rankings y tabla.

- MRR, estados y trials son del momento actual; altas, bajas, churn y las series cubren el rango elegido.
- Los costos de plataforma son de toda la plataforma y no se pueden repartir por sede. Con cualquier filtro de sede
  activo, "costos" y "margen" se muestran como `-` en vez de un numero enganoso.

## Gestion de sedes (desde el dashboard)

Todas las acciones piden confirmacion, se validan en el servidor y quedan en `AuditLog` (evento `SUPERADMIN_*`,
autor = correo del super admin, detalle JSON con antes/despues). El panel lateral muestra el historial de cada sede.

| Accion | Efecto |
|---|---|
| Nueva sede / cliente | Crea la sede (nombre, ciudad, plan, precio, estado inicial en prueba o activa, dias de prueba) y su primer usuario ADMIN. Genera una clave temporal que se muestra **una sola vez** y obliga a cambiarla en el primer inicio de sesion (`mustChangePassword`). No se envia por correo. |
| Editar nombre, ciudad, plan y precio | `PATCH /api/super-admin/clinics/[id]` (solo esos cuatro campos). |
| Suspender acceso | `isActive = false`. Los usuarios de la sede dejan de operar de inmediato (ver abajo). |
| Dar acceso / reactivar | `isActive = true`. Si estaba cancelada: vuelve activa (si tiene precio, con nueva fecha de suscripcion) o en prueba de 14 dias (si no tiene precio). |
| Extender prueba | Suma 1 a 90 dias al fin de la prueba vigente (o desde hoy si ya vencio). Solo sedes en prueba. |
| Terminar prueba | Convertir: pasa a activa y cuenta en el MRR (exige precio). Sin conversion: cancelada y sin acceso. |
| Marcar morosa / pago regularizado | `PAST_DUE` <-> `ACTIVE`. No cambia el acceso. |
| Marcar cancelada | `CANCELED`, fecha de baja (cuenta como churn) y sin acceso. Reversible con "reactivar". |
| Costos de plataforma | Ventana para agregar, editar el monto o borrar costos mensuales (borra solo el registro del costo). |

**No existe** ninguna accion para eliminar una sede ni sus datos.

### La suspension tiene efecto real

Antes, ninguna comprobacion miraba `Clinic.isActive` en las rutas de una sede: la cookie `mg_clinic` firmada seguia valida
hasta que vencia. Ahora `requireClinicSession()` (la usan las ~80 rutas de datos de sede) consulta `Clinic.isActive` y, si esta
suspendida o cancelada, rechaza la solicitud (el super admin queda exento para poder reactivarla). Tambien ya impedian
elegir una sede inactiva `ClinicsService.selectActiveClinic` y el listado de sedes del usuario. Se comprueba en
`tests/dashboardApi.test.mjs` (el admin de la sede Centro opera, se suspende, la API deja de responder, se reactiva y vuelve).

Limite: el `middleware` (edge) solo valida la cookie firmada, no consulta la base. Un usuario de una sede suspendida que ya tenia
una pagina abierta ve la interfaz pero toda llamada a datos falla con "La sede esta suspendida".

## Rutas de API (todas con `requireSuperAdmin()`)

`src/server/super-admin/guard.ts`: 401 sin sesion, 403 si la sesion no es de super admin (o debe cambiar su clave), y vuelve a
comprobar en la base que el usuario siga siendo super admin y este activo.

| Ruta | Uso |
|---|---|
| `GET /api/super-admin/dashboard?months=3\|6\|12&plan=&status=&city=&q=` | Datos del dashboard (validado con zod; 400 si un filtro es invalido) |
| `POST /api/super-admin/clinics` | Crear sede + ADMIN con clave temporal |
| `GET /api/super-admin/clinics/[id]` | Detalle: datos comerciales, usuarios (sin hashes ni datos sensibles), historial |
| `PATCH /api/super-admin/clinics/[id]` | Editar nombre, ciudad, plan, precio |
| `POST /api/super-admin/clinics/[id]/action` | Acciones comerciales de la tabla anterior |
| `GET/POST /api/super-admin/platform-costs`, `PATCH/DELETE .../[id]` | Costos de plataforma |

Seguridad: sin interpolacion de SQL (las dos consultas crudas de actividad usan plantillas etiquetadas parametrizadas,
el resto es Prisma); `passwordHash` nunca se selecciona (Prisma lo omite por defecto en `src/lib/prisma.ts`) y se comprueba en
las pruebas que no aparece en ninguna respuesta; los esquemas zod son `strict` donde editan datos.

## Codigo

- Calculo puro (sin base de datos): `src/server/super-admin/dashboardCalc.ts`. Reutiliza `computeBillingMetrics` de
  `billingMetricsCalc.ts` para MRR, altas, bajas, churn y costos, y agrega filtros, actividad, rankings y crecimiento.
- Reglas de acciones: `clinicActions.ts`. Carga de datos: `dashboardData.ts`.
- UI: `src/presentation/superadmin/SuperAdminDashboard.tsx` y `src/presentation/superadmin/dashboard/*` (graficas, tabla,
  panel de detalle, modales).
- No se agrego ninguna tabla ni migracion: altas, bajas y cambios de estado se derivan de `subscriptionStartedAt` y
  `canceledAt` (como ya hacia el panel de facturacion) y los cambios quedan en `AuditLog`.

## Pruebas

```bash
npm run test:dashboard       # unitarias: calculo, filtros y reglas de acciones (17 pruebas, fecha fija)
npm run seed:test            # carga tambien prisma/test-seed-dashboard.sql
npm run dev                  # o: npx next dev -p 3013
npm run test:dashboard:api   # HTTP contra el servidor (BASE_URL, por defecto http://localhost:3013): 12 pruebas
npm run test:billing:api     # pruebas del panel de facturacion
```

Las pruebas HTTP cubren 401 sin sesion, 403 para admin de sede/doctor/secretaria en **cada** ruta nueva (y que nada cambio),
filtros, validaciones zod, crear sede con clave temporal obligatoria, cada accion y su auditoria, costos y la suspension
efectiva. Crean sedes `Test Dashboard ...` y las borran al terminar, directamente en la base, solo si `DATABASE_URL`
apunta a `localhost`.

## Datos de prueba

`prisma/test-seed-dashboard.sql` (solo ids `seed_dash_*`, se puede repetir): 14 sedes con planes Starter/Pro/Premium, 13
ciudades, activas, morosa, canceladas (hace 6 y 3 meses), una suspendida y tres en prueba (por vencer, a 12 dias y vencida),
altas repartidas en 12 meses, ~1.000 citas, pacientes, usuarios por sede y costos de los meses antiguos. Las cifras exactas dependen
de la fecha, por eso `billingApi.test.mjs` ahora comprueba coherencia interna en vez de numeros fijos.

## Limitaciones

- No hay historial de cambios de plan o precio mas alla de `AuditLog`: el MRR historico se reconstruye con el precio **actual**
  y las fechas de alta y baja. Si se cambia el precio de una sede, las barras de meses pasados cambian. Si se reactiva una
  sede cancelada, su baja anterior deja de aparecer como churn historico.
- No hay region; solo ciudad (texto libre, se agrupa por coincidencia exacta).
- Los meses se cortan con la zona horaria del servidor.
- La clave temporal no se envia por correo; hay que entregarla por un canal seguro.
- No hay cobro ni pasarela de pago: morosa/pagada se marcan a mano.
- "Usuarios activos" cuenta miembros activos de la sede con cuenta activa y no incluye super admin.
- En pantallas angostas el menu lateral pasa arriba como fila desplazable; la tabla se desplaza horizontalmente.
