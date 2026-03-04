import { buildCapabilityStatement } from "@/server/fhir/r4/capabilityStatement";
import { FHIR_BASE_PATH } from "@/server/fhir/r4/constants";
import { buildOperationOutcome, fhirJsonResponse } from "@/server/fhir/r4/http";

export async function GET(req: Request) {
  try {
    const { origin } = new URL(req.url);
    const capabilityStatement = buildCapabilityStatement(`${origin}${FHIR_BASE_PATH}`);
    return fhirJsonResponse(capabilityStatement, 200);
  } catch {
    const outcome = buildOperationOutcome({
      severity: "error",
      code: "processing",
      diagnostics: "Failed to generate FHIR CapabilityStatement.",
    });
    return fhirJsonResponse(outcome, 500);
  }
}

