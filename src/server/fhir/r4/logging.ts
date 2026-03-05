import { createHash } from "node:crypto";

// Patrones PII a redaccionar en texto libre.
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const RUN_PATTERN = /\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b/g;
const PHONE_PATTERN = /\+?\d[\d\s-]{7,}\d/g;
const MAX_STRING_LENGTH = 240;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 50;
const MAX_DEPTH = 4;
const SENSITIVE_KEYS = new Set([
  "firstname",
  "lastname",
  "secondlastname",
  "name",
  "run",
  "email",
  "phone",
  "address",
  "birthdate",
  "emergencycontactname",
  "emergencycontactphone",
  "valuestring",
  "valuequantity",
  "valueboolean",
  "note",
  "notes",
]);

// Acota tamano de strings para evitar logs excesivos.
function normalizeString(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_STRING_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_STRING_LENGTH)}...`;
}

// Type guard para objetos planos serializables.
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Hash corto para referenciar valores sin exponerlos en claro.
function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

// Redacta PII en texto libre (email/RUN/telefono) y aplica truncado defensivo.
export function redactSensitiveText(value: string | null | undefined) {
  if (!value) return value ?? "";
  return normalizeString(
    value
      .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
      .replace(RUN_PATTERN, "[REDACTED_RUN]")
      .replace(PHONE_PATTERN, "[REDACTED_PHONE]")
  );
}

// Enmascara IP para auditoria sin persistir direccion real.
export function maskIpForLog(ip: string | null | undefined) {
  if (!ip) return "unknown";
  return `ip:${hashValue(ip)}`;
}

// Sanitiza recursivamente estructuras arbitrarias para detalle de auditoria.
function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return "[TRUNCATED_DEPTH]";
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === "string") return redactSensitiveText(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeValue(item, depth + 1));
  }

  if (!isPlainObject(value)) {
    return redactSensitiveText(String(value));
  }

  const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);
  const sanitized: Record<string, unknown> = {};
  for (const [key, item] of entries) {
    const normalizedKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(normalizedKey)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }
    sanitized[key] = sanitizeValue(item, depth + 1);
  }
  return sanitized;
}

// Punto de entrada para sanitizar payloads antes de auditar.
export function sanitizeForAudit(value: unknown) {
  return sanitizeValue(value, 0);
}

// Serializa un detalle seguro para guardar en AuditLog.
export function toAuditDetail(value: unknown) {
  try {
    return JSON.stringify(sanitizeForAudit(value));
  } catch {
    return JSON.stringify({
      error: "Failed to serialize audit detail.",
    });
  }
}
