# HL7-008 - Especificacion de Mapeo y Consistencia

Fecha: 2026-03-03  
Estado: Parcial (fase bootstrap)  
Proyecto: MediGest

## Objetivo
Definir mapeo explicito entre modelo interno y recursos FHIR R4 para evitar ambiguedad, asegurar consistencia y habilitar validacion automatizada.

## Reglas Generales
- Todos los recursos FHIR se serializan con `application/fhir+json`.
- Identificador principal temporal: `id FHIR = id interno` (hasta implementar HL7-009 con correlacion persistente).
- Campos sin valor en modelo interno se omiten en FHIR (no se envia string vacio).
- Fechas:
- `DateTime` interno -> `dateTime` FHIR en ISO-8601.
- `Date` clinica -> `date` FHIR `YYYY-MM-DD`.

## Mapeo Patient (interno -> FHIR)

| Campo interno | Campo FHIR | Regla de transformacion | Obligatorio | Validacion |
|---|---|---|---|---|
| `id` | `Patient.id` | Copia directa | Si | No vacio |
| `isActive` | `Patient.active` | Copia booleana | No | Booleano |
| `run` | `Patient.identifier[system=urn:cl:run].value` | Copia directa | Si | No vacio |
| `firstName` | `Patient.name[0].given[0]` | Copia directa | Si | No vacio |
| `lastName` + `secondLastName` | `Patient.name[0].family` | Concatenar con espacio | Si | No vacio |
| `email` | `Patient.telecom[system=email].value` | Copia directa | No | Formato email en capa de entrada |
| `phone` | `Patient.telecom[system=phone].value` | Copia directa | No | No vacio |
| `birthDate` | `Patient.birthDate` | `Date -> YYYY-MM-DD` | No | Fecha valida |
| `gender` | `Patient.gender` | `masculino/male/m -> male`, `femenino/female/f -> female`, `otro/other -> other`, resto `unknown` | No | Valor FHIR valido |
| `address` + `city` | `Patient.address[0].text/city` | Copia directa | No | Longitud no vacia |
| `emergencyContactName/Phone` | `Patient.contact[0]` | Copia con nombre + telecom | No | Telefono no vacio si existe |

## Mapeo Appointment (interno -> FHIR)

| Campo interno | Campo FHIR | Regla de transformacion | Obligatorio | Validacion |
|---|---|---|---|---|
| `id` | `Appointment.id` | Copia directa | Si | No vacio |
| `status` | `Appointment.status` | `SCHEDULED/CONFIRMED -> booked`, `CANCELLED -> cancelled`, `COMPLETED -> fulfilled`, `NO_SHOW -> noshow`, default `proposed` | Si | Valor FHIR valido |
| `startAt` | `Appointment.start` | `Date -> ISO-8601` | Si | Fecha valida |
| `endAt` | `Appointment.end` | `Date -> ISO-8601` | Si | Fecha valida y mayor que start |
| `notes` | `Appointment.description` | Copia directa | No | Texto |
| `createdAt` | `Appointment.created` | `Date -> ISO-8601` | No | Fecha valida |
| `patientId` | `Appointment.participant[].actor.reference` | `Patient/{patientId}` | Si | Referencia no vacia |
| `doctorId` | `Appointment.participant[].actor.reference` | `Practitioner/{doctorId}` | Si | Referencia no vacia |
| `boxId` | `Appointment.participant[].actor.reference` | `Location/{boxId}` | Si | Referencia no vacia |
| `paymentStatus` | `Appointment.extension[url=...payment-status].valueCode` | Copia directa | No | Enum interno |

## Direccion Inversa (FHIR -> interno)
- Se define parser minimo para `Patient` y `Appointment` de entrada.
- Reglas invalidas lanzan error de validacion:
- `Patient`: requiere identificador RUN y nombre basico.
- `Appointment`: requiere referencias `Patient`, `Practitioner`, `Location`, ademas de `start` y `end`.

## Validacion Automatizada
- Script de auto-chequeo: `npm run fhir:check-mapping`
- Cubre:
- Conversión interno -> FHIR para `Patient` y `Appointment`.
- Conversión FHIR -> interno para `Patient` y `Appointment`.
- Reglas de estado y referencias minimas.

## Pendiente Para Cierre Completo HL7-008
- Integrar estos chequeos al pipeline CI oficial.
- Agregar casos invalidos exhaustivos por recurso (relacionado con HL7-012).
- Incorporar correlacion persistente de IDs (HL7-009).
