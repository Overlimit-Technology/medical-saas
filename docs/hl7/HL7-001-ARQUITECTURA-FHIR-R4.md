# HL7-001 - Arquitectura Oficial FHIR R4

Fecha: 2026-03-03  
Estado: Propuesto para aprobacion tecnica  
Proyecto: MediGest

## Decision
MediGest adopta HL7 FHIR R4 (version 4.0.1) como estandar oficial de interoperabilidad clinica para APIs de intercambio.

## Alcance Inicial
- Base endpoint: `/api/fhir/r4`
- Formato oficial: `application/fhir+json`
- Endpoint obligatorio de descubrimiento: `GET /api/fhir/r4/metadata`
- Recursos objetivo de fase inicial:
- `Patient`
- `Appointment`
- `Encounter` (solo si CU-3 esta activo)

## Reglas de Versionado
- Version FHIR fija para esta fase: `4.0.1` (R4).
- Cambios futuros de version mayor (ejemplo R4 -> R5) deben abrir nuevo prefijo de API (`/api/fhir/r5`) sin romper `/api/fhir/r4`.
- Cambios incompatibles dentro de R4 no se permiten sin plan de migracion documentado.

## Politica de Seguridad Para FHIR
- Endpoints con datos clinicos requieren autenticacion y contexto de clinica valida.
- Errores de seguridad se devuelven como `OperationOutcome`.
- El endpoint `/metadata` publica capacidades y restricciones operativas del servidor.

## Operaciones Minimas Por Recurso (objetivo de fase)
- `Patient`: read, search-type, create, update
- `Appointment`: read, search-type, create, update
- `Encounter`: read, search-type, create (condicional a CU-3)

## Criterio de Aceptacion de HL7-001
- Documento versionado en repositorio con:
- Estandar oficial definido (FHIR R4)
- Version exacta definida (`4.0.1`)
- Alcance y recursos objetivo
- Politica de versionado y seguridad de alto nivel

## Relacion con Tickets
- HL7-002: construye la base tecnica y `/metadata`.
- HL7-008: define mapeo campo a campo y pruebas de consistencia.
