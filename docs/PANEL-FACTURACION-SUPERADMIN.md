# Panel de facturacion del super admin

Pagina `/super-admin/facturacion` y ruta `GET /api/super-admin/billing-metrics`. Solo para `isSuperAdmin`:
la ruta responde 401 sin sesion y 403 a cualquier otro rol; la pagina redirige a `/dashboard`.

## Datos

Migracion `20261029120000_add_billing_metrics`:

- `Clinic`: `billingStatus` (TRIAL, ACTIVE, PAST_DUE, CANCELED; por defecto TRIAL), `planName`, `monthlyPrice` (CLP),
  `trialEndsAt`, `subscriptionStartedAt`, `canceledAt`. Las sedes existentes quedan en TRIAL sin precio, es decir, MRR 0
  hasta que se complete su informacion comercial.
- `PlatformCost` (opcional): costos mensuales de operar la plataforma (`month` "YYYY-MM", `category`, `amount`).

No hay pantalla para editar estos datos todavia; se cargan por SQL o seed.

## Definiciones

- Una sede paga en una fecha si tiene precio > 0, `subscriptionStartedAt` <= fecha y no estaba cancelada.
- MRR = suma de precios de las sedes que pagan. ARR = MRR x 12. ARPA = MRR / sedes que pagan.
- Churn del mes = canceladas en el mes / sedes que pagaban al inicio del mes (vacio si no habia ninguna).
- Margen del mes = MRR al cierre del mes (o ahora, el mes en curso) menos costos del mes.
- La serie historica se reconstruye con las fechas de alta y cancelacion; no guarda fotos mensuales.

Codigo: calculo puro en `src/server/super-admin/billingMetricsCalc.ts`, carga en `billingMetrics.ts`,
UI en `src/presentation/superadmin/SuperAdminBilling.tsx` (SVG y CSS, sin librerias de graficos).

## Datos de prueba y cifras esperadas

`npm run seed:test` carga `prisma/test-seed-billing.sql` (ids `seed_billing_*` para sedes y costos nuevos; ademas
asigna datos comerciales a las 3 sedes del seed). Cifras esperadas, calculadas a mano:

| Metrica | Valor |
|---|---|
| MRR | 260.000 (90.000 + 40.000 + 40.000 + 90.000) |
| ARR | 3.120.000 |
| Sedes que pagan / ARPA | 4 / 65.000 |
| Pago atrasado | 1 sede, 40.000 |
| Churn mes anterior | 1 de 4 = 25% |
| Churn mes actual | 0% |
| Costos mes actual / margen | 45.000 / 215.000 (82,7%) |
| Trials / por vencer / canceladas | 1 / 1 / 1 |

## Pruebas

- `npm run test:billing`: calculo con fecha fija y las mismas cifras (9 pruebas).
- `npm run test:billing:api`: contra un servidor local con la base sembrada (`BASE_URL`, por defecto
  `http://localhost:3013`): 401 sin sesion, 403 para admin de sede, doctor y secretaria, 200 con cifras para el super admin.

## Nota sobre migraciones en bases nuevas

`20260515130000_clinic_branding` falla en una base vacia (la columna `Clinic.address` ya existe por una migracion
anterior). No se modifico. En una base local nueva hay que crear a mano `ClinicSettings.logoBase64`, ejecutar
`prisma migrate resolve --applied 20260515130000_clinic_branding` y luego `prisma migrate deploy`.
