# README - IMPLEMENTACION HL7/FHIR

Fecha de actualizacion: 2026-03-04
Proyecto: MediGest

## Objetivo
Definir e implementar interoperabilidad HL7 usando FHIR R4 para los recursos minimos del producto, manteniendo consistencia con la logica actual del sistema.

## Resumen Ejecutivo
- El software YA tiene API interna JSON por HTTP para pacientes, citas y visitas clinicas.
- El software tiene bootstrap FHIR R4 en `/api/fhir/r4` y `/api/fhir/r4/metadata`.
- `Patient` y `Appointment` existen en base de datos y servicios internos.
- `ClinicalVisit` existe y puede mapearse a `Encounter` si se activa CU-3.
- `Observation` ya tiene modelo interno base y endpoints FHIR R4 iniciales.

## Estado Actual Del Software (Hoy)

### Hecho
- `Patient` interno implementado (listado, lectura por id, creacion, actualizacion, eliminacion).
- `Appointment` interno implementado (listado/busqueda, lectura por id, creacion, actualizacion, cancelacion).
- `ClinicalVisit` interno implementado (listado y creacion), usable como base para `Encounter`.
- Validaciones de negocio activas (choques de agenda, relaciones validas, aislamiento por `clinicId`).

### No Hecho
- Endpoints FHIR R4 pendientes (`Encounter`) y cobertura avanzada de operaciones.
- Integracion completa de seguridad y autorizacion para todos los endpoints FHIR de datos.
- Integracion de validaciones y pruebas HL7/FHIR en CI oficial (hoy disponibles via scripts locales).
- Integracion de la correlacion persistente de IDs en todos los endpoints FHIR de negocio.

## Tickets De Implementacion

| Ticket | Punto | Estado | Prioridad | Tarea | Criterio de aceptacion | Como se usa hoy |
|---|---|---|---|---|---|---|
| HL7-001 | Estandar y version | Parcial | Alta | Definir oficialmente HL7 FHIR R4 como estandar principal del producto. | Documento de arquitectura aprobado con version exacta (FHIR R4) y alcance. | Documento base creado: `docs/hl7/HL7-001-ARQUITECTURA-FHIR-R4.md` (pendiente aprobacion formal). |
| HL7-002 | API FHIR base | Parcial | Alta | Crear base `/api/fhir/r4` con `application/fhir+json` y endpoint `/metadata`. | `GET /api/fhir/r4/metadata` responde `CapabilityStatement` valido. | Implementado: `GET /api/fhir/r4` y `GET /api/fhir/r4/metadata` con `application/fhir+json`. |
| HL7-003 | Recurso Patient | Parcial | Alta | Exponer `Patient` en formato FHIR (read, search, create/update segun caso de uso). | Endpoints FHIR Patient operativos y probados contra validadores R4. | FHIR base implementado: `GET/POST /api/fhir/r4/Patient`, `GET/PUT /api/fhir/r4/Patient/{id}` + API interna existente. |
| HL7-004 | Recurso Appointment | Parcial | Alta | Exponer `Appointment` en formato FHIR (read, search, create/update segun caso de uso). | Endpoints FHIR Appointment operativos con estados mapeados correctamente. | FHIR base implementado: `GET/POST /api/fhir/r4/Appointment`, `GET/PUT /api/fhir/r4/Appointment/{id}` + API interna existente. |
| HL7-005 | CU-3 Encounter | Parcial (si CU-3 activo) | Media | Publicar `Encounter` FHIR mapeado desde `ClinicalVisit`. | `Encounter` FHIR permite lectura, busqueda y creacion segun CU-3. | Interno actual: `GET /api/clinical-visits`, `POST /api/clinical-visits` (rol Doctor). |
| HL7-006 | Observation opcional | Parcial | Media | Definir modelo interno + API FHIR para `Observation` (si CU-3 lo requiere). | Modelo, validaciones y endpoints Observation disponibles en R4. | Base implementada: modelo interno `Observation`, mappers y endpoints FHIR `GET/POST /Observation` + `GET/PUT /Observation/{id}`. |
| HL7-007 | Operaciones minimas | Parcial | Alta | Formalizar operaciones minimas por recurso: lectura, busqueda, creacion/actualizacion. | Matriz de operaciones por recurso firmada e implementada en FHIR. | Operaciones existen en API interna, no en FHIR. |
| HL7-008 | Mapeo y consistencia | Parcial | Alta | Crear especificacion de mapeo completo por recurso: fuente -> transformacion -> obligatoriedad -> validacion. | Documento versionado + tests de mapeo pasando CI. | Documento y mappers iniciales en `docs/hl7/HL7-008-MAPEO-Y-CONSISTENCIA.md` y `src/server/fhir/r4/mappers/*`; auto-check: `npm run fhir:check-mapping`. |
| HL7-009 | Correlacion de IDs | Parcial | Alta | Implementar estrategia persistente para `id interno` <-> `id FHIR` (sugerido: tabla `FhirLink`). | Un recurso interno se resuelve de forma deterministica por `fhirId` y/o `identifier`. | Implementado para Patient/Appointment FHIR: modelo `FhirLink` + `FhirLinkService` + resolucion por `fhirId` e `identifier`; pendiente extender a recursos restantes. |
| HL7-010 | Seguridad e interoperabilidad | Parcial | Media | Definir autenticacion/autorizacion para endpoints FHIR y politicas de auditoria. | Politica publicada + controles en API FHIR + trazabilidad en logs. | Seguridad interna por sesion/rol ya existe en API actual. |
| HL7-011 | Validacion de conformidad | Implementado | Media | Agregar pruebas de conformidad FHIR (estructura y reglas minimas por recurso). | Suite automatizada en CI con casos `Patient`, `Appointment`, `Encounter` (si aplica). | Ejecutable por `npm run fhir:check-conformance` e integrado en CI junto a mapping/validation suite. |
| HL7-012 | Validacion estructural y funcional (casos validos/invalidos) | Implementado | Alta | Crear suite de pruebas HL7/FHIR con casos validos e invalidos por recurso y operacion. | Cada caso esperado valida respuesta, estructura FHIR y codigo HTTP; ejecucion automatica en CI. | Implementado en `src/server/fhir/r4/validation.selfcheck.ts` (`npm run fhir:check-validation`) + workflow CI. |
| HL7-013 | Criterio de "pasa" por caso de uso (aceptacion tecnica) | Implementado | Alta | Definir matriz de aceptacion tecnica por CU con precondiciones, pasos, resultado esperado y evidencia. | Cada CU tiene criterio objetivo de pase/rechazo y trazabilidad a tests automatizados. | Matriz formal versionada en `docs/hl7/HL7-013-CRITERIO-ACEPTACION-TECNICA-POR-CU.md` con trazabilidad a `TC-*`. |
| HL7-014 | Autenticacion y autorizacion obligatoria (Capa 7) | Parcial | Alta | Exigir autenticacion y autorizacion en todos los endpoints de intercambio HL7/FHIR. | Ningun endpoint FHIR responde datos sin credenciales validas ni permisos correctos. | La API interna ya usa sesion + roles, pero no existe politica FHIR publicada. |
| HL7-015 | Control de acceso por rol/servicio y proteccion contra abuso | Pendiente | Alta | Implementar control por rol/servicio, cuentas tecnicas y limites basicos (rate limit/throttling). | Se aplican limites por cliente/servicio y respuestas `429` ante abuso, con monitoreo. | Existe control de rol en API interna; no hay limites antiabuso formales. |
| HL7-016 | Auditoria transaccional HL7 | Pendiente | Alta | Registrar cada transaccion HL7 con timestamp, origen, destino, correlacion, resultado y error. | Bitacora consultable con correlacion end-to-end para diagnostico y soporte. | Hay auditoria puntual de eventos, no trazabilidad completa de intercambio HL7. |
| HL7-017 | Minimizacion de datos sensibles en logs | Pendiente | Alta | Aplicar politica de logging seguro (redaccion/mascarado) para no exponer datos clinicos sensibles. | Verificacion automatica/manual confirma que logs contienen solo minimo necesario. | No hay estandar especifico HL7 de redaccion de logs en el proyecto. |

## Avance Implementado (2026-03-04)

- HL7-001: documento de arquitectura FHIR R4 creado en `docs/hl7/HL7-001-ARQUITECTURA-FHIR-R4.md`.
- HL7-002: rutas bootstrap creadas:
  - `GET /api/fhir/r4`
  - `GET /api/fhir/r4/metadata`
- HL7-008: especificacion de mapeo creada en `docs/hl7/HL7-008-MAPEO-Y-CONSISTENCIA.md`.
- HL7-008: mappers iniciales:
  - `src/server/fhir/r4/mappers/patient.ts`
  - `src/server/fhir/r4/mappers/appointment.ts`
- HL7-008: auto-chequeo local ejecutable con `npm run fhir:check-mapping`.
- HL7-009: correlacion persistente integrada en endpoints FHIR de `Patient` y `Appointment` con resolucion por `fhirId` e `identifier`.
- HL7-003: endpoints FHIR `Patient` habilitados (`read`, `search`, `create`, `update`).
- HL7-004: endpoints FHIR `Appointment` habilitados (`read`, `search`, `create`, `update`).
- HL7-006: modelo interno + endpoints FHIR `Observation` habilitados (`read`, `search`, `create`, `update`).
- HL7-011: suite local de conformidad FHIR agregada con `npm run fhir:check-conformance`.
- HL7-011/012: checks FHIR integrados en CI (`.github/workflows/hl7-fhir-validation.yml`).
- HL7-012: suite estructural/funcional agregada con `npm run fhir:check-validation`.
- HL7-013: matriz de aceptacion tecnica por CU documentada en `docs/hl7/HL7-013-CRITERIO-ACEPTACION-TECNICA-POR-CU.md`.
## Reglas Funcionales Recomendadas Para FHIR

- Version fija: FHIR R4.
- Formato: `application/fhir+json`.
- Mantener endpoints internos actuales para frontend y operacion diaria.
- Agregar capa adaptadora FHIR encima de los servicios existentes.
- Mapeo inicial de estado de cita recomendado:
  - `SCHEDULED`/`CONFIRMED` -> `booked`
  - `CANCELLED` -> `cancelled`
  - `COMPLETED` -> `fulfilled`
  - `NO_SHOW` -> `noshow`

## Como Usar Lo Que Ya Esta Hecho (FHIR Bootstrap)

- Base FHIR R4: `GET /api/fhir/r4`
- Metadata FHIR R4: `GET /api/fhir/r4/metadata`
- Header de respuesta: `Content-Type: application/fhir+json`
- Patient FHIR:
  - Buscar: `GET /api/fhir/r4/Patient?name=&identifier=&_id=&_count=`
  - Crear: `POST /api/fhir/r4/Patient`
  - Leer: `GET /api/fhir/r4/Patient/{id}`
  - Actualizar: `PUT /api/fhir/r4/Patient/{id}`
- Appointment FHIR:
  - Buscar: `GET /api/fhir/r4/Appointment?patient=&practitioner=&status=&date=&_id=`
  - Crear: `POST /api/fhir/r4/Appointment`
  - Leer: `GET /api/fhir/r4/Appointment/{id}`
  - Actualizar: `PUT /api/fhir/r4/Appointment/{id}`
- Observation FHIR:
  - Buscar: `GET /api/fhir/r4/Observation?subject=&patient=&code=&status=&date=&_id=`
  - Crear: `POST /api/fhir/r4/Observation`
  - Leer: `GET /api/fhir/r4/Observation/{id}`
  - Actualizar: `PUT /api/fhir/r4/Observation/{id}`
- Validacion local:
  - Mapeos: `npm run fhir:check-mapping`
  - Conformidad: `npm run fhir:check-conformance`
  - Estructural/funcional: `npm run fhir:check-validation`

## Como Usar Lo Que Ya Esta Hecho (API Interna, No FHIR)

### Pacientes
- Listar: `GET /api/patients?q=&page=1&pageSize=20`
- Crear: `POST /api/patients`
- Ver detalle: `GET /api/patients/{id}`
- Actualizar: `PATCH /api/patients/{id}`
- Eliminar: `DELETE /api/patients/{id}`

### Citas
- Listar/buscar: `GET /api/appointments?from=&to=&doctorId=&patientId=&status=&q=`
- Crear: `POST /api/appointments`
- Ver detalle: `GET /api/appointments/{id}`
- Actualizar: `PATCH /api/appointments/{id}`
- Cancelar: `DELETE /api/appointments/{id}` (requiere motivo)

### Visitas Clinicas (base de Encounter)
- Listar (doctor): `GET /api/clinical-visits?patientId=&from=&to=`
- Crear (doctor): `POST /api/clinical-visits`

## Orden Sugerido De Ejecucion
1. HL7-001
2. HL7-002
3. HL7-003
4. HL7-004
5. HL7-007
6. HL7-008
7. HL7-009
8. HL7-005 (cuando CU-3 este activo)
9. HL7-006 (si CU-3 requiere Observation)
10. HL7-010
11. HL7-014
12. HL7-015
13. HL7-016
14. HL7-017
15. HL7-011
16. HL7-012
17. HL7-013

## Nota
Este README separa claramente lo que ya existe en la API interna del producto y lo que aun falta para cumplir interoperabilidad HL7/FHIR R4 de forma formal.

