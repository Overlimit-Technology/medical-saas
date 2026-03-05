# Normas HL7

## Objetivo
Definir reglas operativas para interoperabilidad HL7/FHIR R4 en MediGest, con foco en seguridad, auditoria y trazabilidad.

## Estado actual
- HL7 principal: FHIR R4 (`4.0.1`) en `/api/fhir/r4`.
- Recursos activos: `Patient`, `Appointment`, `Observation`.
- Auditoria transaccional HL7 activa con correlacion por request.
- Redaccion de datos sensibles activa en logs de auditoria HL7.
- Ultima revision: 2026-03-04.

## Estandar y alcance
- Variante seleccionada: HL7 FHIR R4.
- Transporte: HTTPS + JSON (`application/fhir+json`).
- Endpoints base:
  - `GET /api/fhir/r4`
  - `GET /api/fhir/r4/metadata`
  - `GET/POST /api/fhir/r4/Patient`
  - `GET/PUT /api/fhir/r4/Patient/{id}`
  - `GET/POST /api/fhir/r4/Appointment`
  - `GET/PUT /api/fhir/r4/Appointment/{id}`
  - `GET/POST /api/fhir/r4/Observation`
  - `GET/PUT /api/fhir/r4/Observation/{id}`
  - `GET /api/fhir/r4/_audit` (consulta operacional, solo ADMIN)

## Seguridad y autenticacion
- Acceso por sesion de usuario (`mg_session` + `mg_clinic`) o cuenta tecnica.
- Cuentas tecnicas:
  - Header `Authorization: Bearer <token>` o `x-fhir-service-key`.
  - Header opcional `x-fhir-client-id`.
  - Configuracion en `FHIR_TECHNICAL_ACCOUNTS` (JSON).
- Control por rol en endpoints de escritura:
  - `Patient`/`Appointment`: `ADMIN` o `SECRETARY`.
  - `Observation`: `DOCTOR`.
  - `_audit`: `ADMIN`.

## Proteccion contra abuso (HL7-015)
- Rate limit por actor/cliente/servicio.
- Respuesta `429` con `OperationOutcome` en exceso de trafico.
- Headers operacionales:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
  - `Retry-After` (si corresponde)

## Auditoria transaccional (HL7-016)
- Cada transaccion FHIR registra:
  - timestamp
  - origen (ip hash + user-agent redaccionado)
  - destino (path FHIR)
  - correlacion (`X-Correlation-Id`)
  - resultado (status, outcome, duracion)
  - error (si aplica, redaccionado)
- Eventos registrados:
  - `hl7.fhir.transaction`
  - `hl7.fhir.rate_limit.blocked`

## Minimizacion de datos sensibles (HL7-017)
- No se guarda payload clinico completo en auditoria HL7.
- Redaccion automatica de patrones sensibles:
  - email
  - RUN
  - telefono
- En objetos se enmascaran campos sensibles comunes:
  - nombre/apellidos
  - run
  - email/telefono
  - direccion
  - fecha de nacimiento
  - contactos de emergencia
  - notas y valores clinicos directos

## Conformidad y verificaciones
- Mapeos: `npm run fhir:check-mapping`
- Conformidad: `npm run fhir:check-conformance`
- Validacion funcional: `npm run fhir:check-validation`
- Tipos: `npx tsc --noEmit`

## Pendientes
- Endpoint FHIR `Encounter` (CU-3).
- Rate limit distribuido (store compartido) para escenarios multi instancia.
