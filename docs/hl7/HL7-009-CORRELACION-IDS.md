# HL7-009 - Correlacion Persistente de IDs

Fecha: 2026-03-03  
Estado: Parcial (base persistente implementada)  
Proyecto: MediGest

## Objetivo
Garantizar resolucion deterministica entre recursos internos y recursos FHIR mediante una tabla de correlacion persistente (`FhirLink`).

## Estrategia Implementada
- Tabla `FhirLink` en base de datos con llaves unicas por clinica y tipo de recurso:
- `(clinicId, resourceType, internalId)` unico
- `(clinicId, resourceType, fhirId)` unico
- `(clinicId, resourceType, identifierKey)` unico (cuando existe)

## Campos Clave
- `resourceType`: tipo de recurso FHIR (`PATIENT`, `APPOINTMENT`, `ENCOUNTER`, `OBSERVATION`)
- `internalId`: id del recurso en MediGest
- `fhirId`: id expuesto en API FHIR
- `identifierSystem`, `identifierValue`, `identifierKey`: soporte de resolucion por identificador clinico externo

## Servicio de Dominio
Archivo: `src/server/fhir/r4/FhirLinkService.ts`

Operaciones base:
- `ensureLink(...)`: crea o reutiliza correlacion persistente para un `internalId`.
- `resolveInternalIdByFhirId(...)`: resuelve `internalId` desde `fhirId`.
- `resolveInternalIdByIdentifier(...)`: resuelve `internalId` desde `identifier`.
- `resolveInternalId(...)`: estrategia deterministica (primero `fhirId`, luego `identifier`).
- `getByInternalId(...)`: obtiene correlacion existente por id interno.

## Reglas de Resolucion
- Si existe link por `internalId`, se reutiliza.
- Si se intenta registrar un `fhirId` o `identifier` ya usado por otro recurso, se rechaza por restriccion unica.
- `identifierKey` se normaliza como `system|value` para que la busqueda sea estable.

## Pendientes Para Cierre Completo HL7-009
- Extender uso de `FhirLinkService` a recursos FHIR pendientes (`Encounter`, `Observation` cuando aplique).
- Definir politica final de generacion de `fhirId` para integraciones externas.
- Agregar pruebas automatizadas integradas en CI para conflictos y resolucion.
