import { FHIR_BASE_PATH } from "@/server/fhir/r4/constants";

// Entrada minima de un Bundle searchset: solo necesita el recurso ya mapeado.
type BundleEntry = {
  resource: Record<string, unknown>;
};

// Arma un Bundle tipo searchset con fullUrl estandar para cada recurso.
export function buildSearchSetBundle(
  origin: string,
  resourceType: "Patient" | "Appointment" | "Observation",
  entries: BundleEntry[]
) {
  return {
    resourceType: "Bundle",
    type: "searchset",
    total: entries.length,
    entry: entries.map((entry) => {
      const resourceId = String(entry.resource.id ?? "");
      return {
        fullUrl: `${origin}${FHIR_BASE_PATH}/${resourceType}/${resourceId}`,
        resource: entry.resource,
        search: {
          mode: "match",
        },
      };
    }),
  };
}
