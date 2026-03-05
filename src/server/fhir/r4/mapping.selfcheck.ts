import assert from "node:assert/strict";
import {
  mapFhirPatientToInternalDraft,
  mapInternalPatientToFhir,
} from "./mappers/patient";
import {
  mapFhirAppointmentToInternalDraft,
  mapInternalAppointmentToFhir,
} from "./mappers/appointment";
import {
  mapFhirObservationToInternalDraft,
  mapInternalObservationToFhir,
} from "./mappers/observation";

// Prueba rapida del mapeo Patient en ambos sentidos (interno -> FHIR -> interno).
function runPatientChecks() {
  const fhir = mapInternalPatientToFhir({
    id: "pat-1",
    isActive: true,
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
    emergencyContactName: "Luis Perez",
    emergencyContactPhone: "+56911111111",
  });

  assert.equal(fhir.resourceType, "Patient");
  assert.equal(fhir.id, "pat-1");
  assert.equal(fhir.gender, "female");
  assert.equal(fhir.identifier?.[0]?.value, "12.345.678-9");
  assert.equal(fhir.birthDate, "1990-06-15");

  const draft = mapFhirPatientToInternalDraft(fhir);
  assert.equal(draft.firstName, "Ana");
  assert.equal(draft.lastName, "Perez");
  assert.equal(draft.secondLastName, "Lopez");
  assert.equal(draft.run, "12.345.678-9");
  assert.equal(draft.gender, "FEMENINO");
}

// Prueba rapida del mapeo Appointment en ambos sentidos.
function runAppointmentChecks() {
  const fhir = mapInternalAppointmentToFhir({
    id: "appt-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    boxId: "box-1",
    startAt: "2026-03-03T14:00:00.000Z",
    endAt: "2026-03-03T14:30:00.000Z",
    status: "CONFIRMED",
    paymentStatus: "PENDING",
    notes: "Control anual",
    createdAt: "2026-03-01T09:00:00.000Z",
    patient: {
      firstName: "Ana",
      lastName: "Perez",
      secondLastName: "Lopez",
    },
    doctor: {
      email: "doctor@example.com",
      profile: {
        firstName: "Mario",
        lastName: "Rojas",
      },
    },
    box: {
      name: "Box 1",
    },
  });

  assert.equal(fhir.resourceType, "Appointment");
  assert.equal(fhir.status, "booked");
  assert.equal(fhir.participant.length, 3);
  assert.equal(fhir.extension?.[0]?.valueCode, "PENDING");

  const draft = mapFhirAppointmentToInternalDraft(fhir);
  assert.equal(draft.patientId, "pat-1");
  assert.equal(draft.doctorId, "doc-1");
  assert.equal(draft.boxId, "box-1");
  assert.equal(draft.status, "SCHEDULED");
  assert.equal(draft.paymentStatus, "PENDING");
}

// Prueba rapida del mapeo Observation en ambos sentidos.
function runObservationChecks() {
  const fhir = mapInternalObservationToFhir({
    id: "obs-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    clinicalVisitId: "enc-1",
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
    effectiveAt: "2026-03-03T14:10:00.000Z",
    issuedAt: "2026-03-03T14:11:00.000Z",
    notes: "Sin novedades",
  });

  assert.equal(fhir.resourceType, "Observation");
  assert.equal(fhir.status, "final");
  assert.equal(fhir.code.coding?.[0]?.code, "8867-4");
  assert.equal(fhir.subject.reference, "Patient/pat-1");
  assert.equal(fhir.valueQuantity?.value, 78);

  const draft = mapFhirObservationToInternalDraft(fhir);
  assert.equal(draft.patientId, "pat-1");
  assert.equal(draft.doctorId, "doc-1");
  assert.equal(draft.clinicalVisitId, "enc-1");
  assert.equal(draft.valueType, "QUANTITY");
  assert.equal(draft.valueQuantity, 78);
}

// Punto de entrada del script de chequeo local/CI.
function run() {
  runPatientChecks();
  runAppointmentChecks();
  runObservationChecks();
  // Keep output short so CI logs stay readable.
  // eslint-disable-next-line no-console
  console.log("FHIR mapping self-check passed.");
}

run();
