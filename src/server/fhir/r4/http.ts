import { NextResponse } from "next/server";
import { FHIR_JSON_CONTENT_TYPE } from "@/server/fhir/r4/constants";

// Severidades permitidas por FHIR para OperationOutcome.issue.severity.
type OperationOutcomeSeverity = "fatal" | "error" | "warning" | "information";

// Estructura minima del issue que devolvemos en errores/informacion FHIR.
type OperationOutcomeIssue = {
  severity: OperationOutcomeSeverity;
  code: string;
  diagnostics: string;
};

// Helper para crear un OperationOutcome simple de un solo issue.
export function buildOperationOutcome(issue: OperationOutcomeIssue) {
  return {
    resourceType: "OperationOutcome",
    issue: [issue],
  };
}

// Respuesta estandar FHIR JSON con headers consistentes para todas las rutas.
export function fhirJsonResponse(
  resource: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
) {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", `${FHIR_JSON_CONTENT_TYPE}; charset=utf-8`);
  headers.set("Cache-Control", "no-store");

  return new NextResponse(JSON.stringify(resource), {
    status,
    headers,
  });
}
