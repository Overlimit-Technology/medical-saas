# HL7-011 - Validacion de Conformidad FHIR

Fecha: 2026-03-04  
Estado: Implementado (base + CI)  
Proyecto: MediGest

## Objetivo
Automatizar verificaciones de conformidad minima FHIR para recursos soportados y `CapabilityStatement`.

## Suite Implementada
Script:
- `src/server/fhir/r4/conformance.selfcheck.ts`
- `src/server/fhir/r4/validation.selfcheck.ts` (complemento funcional HL7-012)

Comando:
- `npm run fhir:check-conformance`
- `npm run fhir:check-validation`

## Cobertura Actual
- `Patient`: estructura minima valida.
- `Appointment`: estructura minima, participantes y fechas.
- `Observation`: estructura minima, code, subject y value[x].
- `CapabilityStatement`: version FHIR, formato y operaciones declaradas.
- `Encounter`: validacion condicional (si esta declarado, al menos documentacion presente).

## Relacion con HL7-008
- `npm run fhir:check-mapping` valida transformaciones internas <-> FHIR.
- `npm run fhir:check-conformance` valida conformidad estructural minima del payload FHIR resultante.
- `npm run fhir:check-validation` valida casos funcionales validos/invalidos por operacion.

## Estado de Cierre
- Checks integrados en CI: `.github/workflows/hl7-fhir-validation.yml`.
- Casos de respuesta funcional por operacion cubiertos via HL7-012.
- Pendiente opcional: validacion con perfiles/IG externos si un partner lo requiere.
