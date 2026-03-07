# HL7-012 - Validacion Estructural y Funcional

Fecha: 2026-03-04  
Estado: Implementado (suite automatizada)  
Proyecto: MediGest

## Objetivo
Implementar una suite HL7/FHIR con casos validos e invalidos por recurso y operacion, verificando codigo HTTP, estructura FHIR y formato de respuesta.

## Suite Implementada
Archivo:
- `src/server/fhir/r4/validation.selfcheck.ts`

Comando:
- `npm run fhir:check-validation`

Cobertura del comando:
- Casos por recurso y operacion para `Patient`, `Appointment`, `Observation`.
- Casos de descubrimiento (`/api/fhir/r4`) y `CapabilityStatement` (`/metadata`).
- Validacion de:
- Status HTTP esperado (`200`, `201`, `400`, `404`).
- Header `Content-Type` (`application/fhir+json`).
- Estructura FHIR (`OperationOutcome`, `Bundle/searchset`, recursos R4, `CapabilityStatement`).

## Resumen de Casos
Total casos automatizados: `25`

- `CU-FHIR-01`: descubrimiento FHIR base y metadata.
- `CU-FHIR-02`: Patient search/read (valido + no encontrado).
- `CU-FHIR-03`: Patient create/update (valido + invalido).
- `CU-FHIR-04`: Appointment search/read (valido + invalido).
- `CU-FHIR-05`: Appointment create/update (valido + invalido).
- `CU-FHIR-06`: Observation search/read (valido + invalido).
- `CU-FHIR-07`: Observation create/update (valido + invalido).

## Integracion CI
Workflow:
- `.github/workflows/hl7-fhir-validation.yml`

Ejecucion automatica:
- `npm run fhir:check-mapping`
- `npm run fhir:check-conformance`
- `npm run fhir:check-validation`

## Relacion Con Otros Tickets
- HL7-008: la suite consume mappers y reglas de transformacion ya definidas.
- HL7-011: extiende la validacion base con escenarios funcionales validos/invalidos por operacion.
- HL7-013: la trazabilidad por CU y criterio de pase se define en matriz tecnica formal.
