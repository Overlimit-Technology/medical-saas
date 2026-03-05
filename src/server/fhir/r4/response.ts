import { buildOperationOutcome, fhirJsonResponse } from "@/server/fhir/r4/http";

// Envuelve errores de negocio/validacion en un OperationOutcome FHIR.
export function fhirErrorResponse(status: number, diagnostics: string, code = "processing") {
  return fhirJsonResponse(
    buildOperationOutcome({
      severity: status >= 500 ? "error" : "error",
      code,
      diagnostics,
    }),
    status
  );
}

// Traduce mensajes de error libres a codigos HTTP consistentes.
export function mapErrorToHttpStatus(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("no autorizado") || normalized.includes("unauthorized")) return 401;
  if (normalized.includes("acceso denegado") || normalized.includes("forbidden")) return 403;
  if (
    normalized.includes("no encontrado") ||
    normalized.includes("not found") ||
    normalized.includes("clinica no seleccionada")
  ) {
    return 404;
  }
  if (
    normalized.includes("invalid") ||
    normalized.includes("invalido")
  ) {
    return 400;
  }
  if (
    normalized.includes("conflicto") ||
    normalized.includes("conflict") ||
    normalized.includes("registrado")
  ) {
    return 409;
  }
  return 400;
}
