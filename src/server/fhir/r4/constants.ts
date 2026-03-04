// Version exacta de FHIR que declaramos en metadata y docs.
export const FHIR_R4_VERSION = "4.0.1";
// Content-Type oficial para respuestas FHIR en JSON.
export const FHIR_JSON_CONTENT_TYPE = "application/fhir+json";
// Prefijo base de todas las rutas FHIR de esta app.
export const FHIR_BASE_PATH = "/api/fhir/r4";

// Sistema de identificador que usamos para RUN chileno en Patient.identifier.
export const RUN_IDENTIFIER_SYSTEM = "urn:cl:run";
// URL de extension propia para exponer paymentStatus en Appointment.
export const APPOINTMENT_PAYMENT_STATUS_EXTENSION_URL =
  "https://medigest.cl/fhir/StructureDefinition/appointment-payment-status";
