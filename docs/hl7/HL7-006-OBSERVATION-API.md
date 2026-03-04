# HL7-006 - Observation (Modelo Interno + API FHIR)

Fecha: 2026-03-04  
Estado: Parcial (fase base implementada)  
Proyecto: MediGest

## Objetivo
Agregar soporte de `Observation` en FHIR R4, incluyendo modelo interno persistente, validaciones y endpoints de lectura/escritura.

## Implementacion
- Modelo Prisma:
- `Observation`
- enums `ObservationStatus`, `ObservationValueType`
- relaciones con `Clinic`, `Patient`, `User(doctor)` y `ClinicalVisit` opcional

Archivos clave:
- `prisma/schema.prisma`
- `prisma/migrations/20260304101500_add_observations/migration.sql`

- Servicio interno:
- `src/server/observations/ObservationsService.ts`
- Operaciones: `list`, `getById`, `create`, `update`
- Validaciones: consistencia de doctor/paciente/clinicalVisit y valor segun `valueType`

- Mapper FHIR:
- `src/server/fhir/r4/mappers/observation.ts`
- Conversión bidireccional:
- interno -> `Observation` FHIR
- FHIR -> borrador interno con validaciones minimas

- Endpoints FHIR R4:
- `GET /api/fhir/r4/Observation` (search)
- `POST /api/fhir/r4/Observation` (create)
- `GET /api/fhir/r4/Observation/{id}` (read)
- `PUT /api/fhir/r4/Observation/{id}` (update)

## Correlacion de IDs (HL7-009)
- Integrado con `FhirLinkService` para `resourceType=OBSERVATION`.
- Resolucion por `fhirId` y enlaces persistentes por clinica.

## Pendientes Para Cierre Completo HL7-006
- Definir catalogo oficial de codigos clinicos (ej. LOINC) por caso de uso.
- Agregar reglas clinicas por tipo de observacion en validacion funcional avanzada.
- Integrar pruebas de casos invalidos exhaustivos en CI (HL7-012).
