# Boletas de honorarios (opciones A y B)

La emision real de la boleta ocurre en sii.cl, con la clave del profesional (o de un usuario autorizado por el). El software prepara todo lo demas. No usa APIs ni robots sobre el SII.

## Flujo

1. Admin abre `/liquidaciones`, elige el mes y aprieta **Cerrar mes y avisar a profesionales**.
2. El sistema congela los montos (una boleta pendiente por profesional) y envia un correo con el boton **Generar mi boleta**.
3. El profesional entra a `/mis-boletas`, copia razon social, RUT, descripcion y monto, emite la boleta en el SII y registra el numero.
4. Admin ve el estado en el tablero **Boletas de honorarios del mes** y marca **Pagada**.

### Opcion B (delegacion oficial del SII)

El profesional autoriza a un usuario de la clinica en la Oficina Virtual del SII (vigencia maxima de un ano) y registra la fecha de termino en `/mis-boletas`. Mientras la delegacion este vigente, Admin y Secretaria pueden registrar el numero de boleta en su nombre.

## Montos

| Concepto | Calculo |
|---|---|
| Monto de la boleta | Total recaudado menos la parte de la clinica |
| Retencion SII | Monto de la boleta por el % SII configurado |
| Liquido | Monto de la boleta menos la retencion SII |

La retencion legal del SII es 15,25% en 2026, 16% en 2027 y 17% en 2028 (Ley 21.133). Si el % configurado difiere, la pantalla muestra una advertencia.

## Estados

`PENDING` (pendiente) -> `ISSUED` (emitida, con numero) -> `PAID` (pagada). `CANCELLED` (anulada) disponible para Admin mientras no este pagada.

## Archivos

| Area | Archivo |
|---|---|
| Modelo | `prisma/schema.prisma` (`ProfessionalInvoice`, `Clinic.legalName/taxId`, `DoctorProfile.siiDelegationUntil`) |
| Migracion | `prisma/migrations/20261015120000_add_professional_invoices/migration.sql` |
| Servicio | `src/server/professional-payouts/ProfessionalInvoicesService.ts` |
| Cierre y correo | `src/server/professional-payouts/ProfessionalPayoutsService.ts` |
| API | `src/app/api/professional-payouts/invoices`, `invoices/[id]`, `delegation` |
| Pantallas | `src/presentation/liquidaciones/MisBoletas.tsx`, `InvoiceBoard.tsx`, `src/app/(app)/mis-boletas/page.tsx` |
| Datos del receptor | `src/app/api/clinic-profile/route.ts` (campos `legalName`, `taxId`) |

## Pendiente

- Confirmar con el contador como declara la clinica la retencion y que hacer con boletas de prueba.
- Enlace a "Mi boleta" en el menu lateral.
- Verificacion visual del tablero de admin (probado solo por API).
- Los hallazgos de seguridad A-01 y similares aplican tambien a estas rutas hasta que se corrijan los permisos.
