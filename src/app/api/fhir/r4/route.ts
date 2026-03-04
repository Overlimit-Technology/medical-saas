import { buildOperationOutcome, fhirJsonResponse } from "@/server/fhir/r4/http";
import { FHIR_BASE_PATH } from "@/server/fhir/r4/constants";

export async function GET(req: Request) {
  try {
    const { origin } = new URL(req.url);
    const metadataUrl = `${origin}${FHIR_BASE_PATH}/metadata`;
    const outcome = buildOperationOutcome({
      severity: "information",
      code: "informational",
      diagnostics: `FHIR R4 base endpoint active. Use ${metadataUrl} to fetch CapabilityStatement.`,
    });

    return fhirJsonResponse(outcome, 200, {
      Link: `<${metadataUrl}>; rel="service-desc"`,
    });
  } catch {
    const outcome = buildOperationOutcome({
      severity: "error",
      code: "processing",
      diagnostics: "Could not resolve FHIR base endpoint metadata link.",
    });
    return fhirJsonResponse(outcome, 500);
  }
}

