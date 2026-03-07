// Limpia strings para evitar parsear valores vacios.
function clean(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

// Extrae el id desde referencias FHIR tipo ResourceType/{id}; si no matchea, devuelve el valor normalizado.
export function parseFhirReferenceId(value: string | null | undefined, resourceType: string) {
  const normalized = clean(value);
  if (!normalized) return null;
  const regex = new RegExp(`(?:^|/)${resourceType}/([^/]+)$`);
  const match = normalized.match(regex);
  if (match?.[1]) return match[1];
  return normalized;
}

// Parsea el search param identifier en formato "system|value" o solo "value".
export function parseSearchIdentifier(value: string | null) {
  const normalized = clean(value);
  if (!normalized) return null;

  const parts = normalized.split("|");
  if (parts.length === 1) {
    return {
      system: null as string | null,
      value: parts[0],
    };
  }

  return {
    system: parts[0] || null,
    value: parts.slice(1).join("|"),
  };
}
