# HL7-013 - Criterio de Aceptacion Tecnica por CU

Fecha: 2026-03-04  
Estado: Implementado (matriz versionada)  
Proyecto: MediGest

## Objetivo
Definir criterio objetivo de pase/rechazo por caso de uso FHIR, con precondiciones, pasos, resultado esperado y evidencia automatizada trazable.

## Regla General de Pase
- Un CU se considera aprobado solo si todos sus tests asociados (`TC-*`) pasan en CI.
- Si falla al menos un test asociado, el CU queda rechazado hasta correccion.

## Matriz de Aceptacion Tecnica

| CU | Precondiciones | Pasos de validacion | Resultado esperado | Criterio objetivo pase/rechazo | Evidencia automatizada |
|---|---|---|---|---|---|
| `CU-FHIR-01` Descubrimiento y metadata | API FHIR base habilitada con version R4 | 1) Consultar endpoint base. 2) Consultar `/metadata`. | Respuesta FHIR JSON valida con `OperationOutcome` informativo y `CapabilityStatement` coherente. | Pasa si `HTTP 200`, `Content-Type` FHIR y `fhirVersion=4.0.1`. Rechaza si falta metadata o formato incorrecto. | `TC-CU1-BASE-GET-200`, `TC-CU1-METADATA-GET-200` |
| `CU-FHIR-02` Patient read/search | Mapper Patient operativo y searchset disponible | 1) Ejecutar busqueda Patient. 2) Leer Patient existente. 3) Leer Patient inexistente. | Bundle `searchset` valido, recurso `Patient` valido y `404` con `OperationOutcome` para no encontrado. | Pasa si cumple estructura FHIR y codigos HTTP esperados (`200/404`). Rechaza ante payload invalido o status incorrecto. | `TC-CU2-PATIENT-SEARCH-200`, `TC-CU2-PATIENT-READ-200`, `TC-CU2-PATIENT-READ-404` |
| `CU-FHIR-03` Patient create/update | Validacion de entrada Patient activa | 1) Crear Patient valido. 2) Crear Patient invalido (sin RUN). 3) Actualizar valido. 4) Actualizar invalido (id inconsistente). | `201` con `Location` para alta valida, `200` para update valido y `400` para entradas invalidas. | Pasa si se respetan codigos HTTP y estructura `Patient/OperationOutcome`. Rechaza si acepta payload invalido o no retorna `Location`. | `TC-CU3-PATIENT-CREATE-201`, `TC-CU3-PATIENT-CREATE-400`, `TC-CU3-PATIENT-UPDATE-200`, `TC-CU3-PATIENT-UPDATE-400` |
| `CU-FHIR-04` Appointment read/search | Mapper Appointment y filtros de status habilitados | 1) Buscar Appointment con status valido. 2) Buscar con status invalido. 3) Leer existente. 4) Leer inexistente. | Bundle valido para busqueda correcta, `400` para status invalido, `200/404` en read segun existencia. | Pasa si valida filtros y responde con `Bundle`/`OperationOutcome` correctos. Rechaza si no distingue invalido/no encontrado. | `TC-CU4-APPOINTMENT-SEARCH-200`, `TC-CU4-APPOINTMENT-SEARCH-400`, `TC-CU4-APPOINTMENT-READ-200`, `TC-CU4-APPOINTMENT-READ-404` |
| `CU-FHIR-05` Appointment create/update | Parser Appointment con validacion de participantes activo | 1) Crear valido. 2) Crear invalido (sin Location). 3) Actualizar valido. 4) Actualizar invalido (id inconsistente). | `201` con `Location` al crear valido, `200` en update valido y `400` en payload invalido. | Pasa si se validan referencias obligatorias y consistencia de `id` URL/cuerpo. Rechaza si se permiten participantes incompletos. | `TC-CU5-APPOINTMENT-CREATE-201`, `TC-CU5-APPOINTMENT-CREATE-400`, `TC-CU5-APPOINTMENT-UPDATE-200`, `TC-CU5-APPOINTMENT-UPDATE-400` |
| `CU-FHIR-06` Observation read/search | Mapper Observation y filtros de status habilitados | 1) Buscar Observation con status valido. 2) Buscar con status invalido. 3) Leer existente. 4) Leer inexistente. | Bundle valido en busqueda correcta, `400` para status invalido y `200/404` segun existencia. | Pasa si status invalido no se procesa y las respuestas mantienen formato FHIR. Rechaza si hay codigos HTTP incorrectos. | `TC-CU6-OBSERVATION-SEARCH-200`, `TC-CU6-OBSERVATION-SEARCH-400`, `TC-CU6-OBSERVATION-READ-200`, `TC-CU6-OBSERVATION-READ-404` |
| `CU-FHIR-07` Observation create/update | Parser Observation con regla `value[x]` activo | 1) Crear valido. 2) Crear invalido (sin `value[x]`). 3) Actualizar valido. 4) Actualizar invalido (id inconsistente). | `201` con `Location` en alta valida, `200` en update valido y `400` para entradas invalidas. | Pasa si exige `valueString/valueBoolean/valueQuantity` y respeta integridad de `id`. Rechaza si crea/actualiza con payload incompleto. | `TC-CU7-OBSERVATION-CREATE-201`, `TC-CU7-OBSERVATION-CREATE-400`, `TC-CU7-OBSERVATION-UPDATE-200`, `TC-CU7-OBSERVATION-UPDATE-400` |

## Evidencia y Ejecucion
Comando unico de evidencia funcional HL7:
- `npm run fhir:check-validation`

Evidencia complementaria para conformidad y mapeo:
- `npm run fhir:check-mapping`
- `npm run fhir:check-conformance`

CI oficial:
- `.github/workflows/hl7-fhir-validation.yml`
