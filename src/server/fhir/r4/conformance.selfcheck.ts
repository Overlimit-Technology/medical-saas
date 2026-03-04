import assert from "node:assert/strict";
import { buildCapabilityStatement } from "@/server/fhir/r4/capabilityStatement";
import { FHIR_JSON_CONTENT_TYPE, FHIR_R4_VERSION } from "@/server/fhir/r4/constants";
import { mapInternalPatientToFhir } from "@/server/fhir/r4/mappers/patient";
import { mapInternalAppointmentToFhir } from "@/server/fhir/r4/mappers/appointment";
import { mapInternalObservationToFhir } from "@/server/fhir/r4/mappers/observation";

// Valida si un string representa una fecha ISO parseable.
function isIsoDate(value: string | undefined) {
  if (!value) return false;
  return !Number.isNaN(new Date(value).valueOf());
}

// Verifica estructura minima del recurso Patient mapeado a FHIR.
function checkPatientConformance() {
  const patient = mapInternalPatientToFhir({
    id: "pat-100",
    firstName: "Ana",
    lastName: "Perez",
    secondLastName: "Lopez",
    run: "12.345.678-9",
    email: "ana@example.com",
    phone: "+56912345678",
    birthDate: "1990-06-15",
    gender: "femenino",
    address: "Calle 123",
    city: "Santiago",
  });

  assert.equal(patient.resourceType, "Patient");
  assert.equal(patient.id, "pat-100");
  assert.equal(patient.identifier?.[0]?.value, "12.345.678-9");
  assert.ok(patient.name?.[0]?.family);
}

// Verifica estructura minima de Appointment y referencias de participantes.
function checkAppointmentConformance() {
  const appointment = mapInternalAppointmentToFhir({
    id: "appt-100",
    patientId: "pat-100",
    doctorId: "doc-100",
    boxId: "box-100",
    startAt: "2026-03-04T13:00:00.000Z",
    endAt: "2026-03-04T13:30:00.000Z",
    status: "SCHEDULED",
    paymentStatus: "PENDING",
    notes: "Control",
    createdAt: "2026-03-03T10:00:00.000Z",
  });

  assert.equal(appointment.resourceType, "Appointment");
  assert.ok(appointment.status);
  assert.ok(isIsoDate(appointment.start));
  assert.ok(isIsoDate(appointment.end));
  assert.ok(appointment.participant.some((p) => p.actor?.reference?.startsWith("Patient/")));
  assert.ok(appointment.participant.some((p) => p.actor?.reference?.startsWith("Practitioner/")));
  assert.ok(appointment.participant.some((p) => p.actor?.reference?.startsWith("Location/")));
}

// Verifica estructura minima de Observation y presencia de value[x].
function checkObservationConformance() {
  const observation = mapInternalObservationToFhir({
    id: "obs-100",
    patientId: "pat-100",
    doctorId: "doc-100",
    clinicalVisitId: "enc-100",
    status: "FINAL",
    code: "8867-4",
    codeSystem: "http://loinc.org",
    codeDisplay: "Heart rate",
    categoryCode: "vital-signs",
    categorySystem: "http://terminology.hl7.org/CodeSystem/observation-category",
    categoryDisplay: "Vital Signs",
    valueType: "QUANTITY",
    valueQuantity: 78,
    valueUnit: "/min",
    effectiveAt: "2026-03-04T13:10:00.000Z",
    issuedAt: "2026-03-04T13:11:00.000Z",
    notes: "Sin novedades",
  });

  assert.equal(observation.resourceType, "Observation");
  assert.ok(observation.status);
  assert.ok(observation.code?.coding?.[0]?.code);
  assert.ok(observation.subject?.reference?.startsWith("Patient/"));
  assert.ok(isIsoDate(observation.effectiveDateTime));
  assert.ok(
    typeof observation.valueString === "string" ||
      typeof observation.valueBoolean === "boolean" ||
      typeof observation.valueQuantity?.value === "number"
  );
}

// Verifica metadata del CapabilityStatement y operaciones declaradas.
function checkCapabilityStatementConformance() {
  const metadata = buildCapabilityStatement("https://example.org/api/fhir/r4");
  assert.equal(metadata.resourceType, "CapabilityStatement");
  assert.equal(metadata.fhirVersion, FHIR_R4_VERSION);
  assert.ok(metadata.format.includes(FHIR_JSON_CONTENT_TYPE));

  const resources = metadata.rest?.[0]?.resource ?? [];
  const byType = new Map(resources.map((resource) => [resource.type, resource]));

  const patient = byType.get("Patient");
  assert.ok(patient);
  assert.ok(patient.interaction?.some((item) => item.code === "read"));
  assert.ok(patient.interaction?.some((item) => item.code === "search-type"));
  assert.ok(patient.interaction?.some((item) => item.code === "create"));
  assert.ok(patient.interaction?.some((item) => item.code === "update"));

  const appointment = byType.get("Appointment");
  assert.ok(appointment);
  assert.ok(appointment.interaction?.some((item) => item.code === "read"));
  assert.ok(appointment.interaction?.some((item) => item.code === "search-type"));
  assert.ok(appointment.interaction?.some((item) => item.code === "create"));
  assert.ok(appointment.interaction?.some((item) => item.code === "update"));

  const observation = byType.get("Observation");
  assert.ok(observation);
  assert.ok(observation.interaction?.some((item) => item.code === "read"));
  assert.ok(observation.interaction?.some((item) => item.code === "search-type"));
  assert.ok(observation.interaction?.some((item) => item.code === "create"));
  assert.ok(observation.interaction?.some((item) => item.code === "update"));

  // Encounter remains optional until CU-3 is fully active.
  const encounter = byType.get("Encounter");
  if (encounter) {
    assert.equal(typeof encounter.documentation, "string");
  }
}

// Punto de entrada para ejecutar toda la suite de conformidad.
function run() {
  checkPatientConformance();
  checkAppointmentConformance();
  checkObservationConformance();
  checkCapabilityStatementConformance();
  // eslint-disable-next-line no-console
  console.log("FHIR conformance self-check passed.");
}

run();
