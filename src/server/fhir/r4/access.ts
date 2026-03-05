import { timingSafeEqual } from "node:crypto";
import { requireClinicSession, type SessionContext } from "@/server/auth/requireSession";

// Roles de negocio permitidos para integraciones FHIR.
type SupportedRole = "ADMIN" | "SECRETARY" | "DOCTOR";
// Config minima esperada para una cuenta tecnica FHIR.
type TechnicalAccountConfig = {
  clientId: string;
  token: string;
  clinicId: string;
  role: SupportedRole;
  userId?: string;
  rateLimitPerMinute?: number;
  enabled?: boolean;
};

export type FhirSessionContext = SessionContext & {
  authType: "user" | "service";
  clientId?: string;
  rateLimitPerMinute: number;
};

// Actor normalizado que usa la capa transversal de transacciones FHIR.
export type FhirActorContext = {
  authType: "user" | "service" | "anonymous";
  actorId: string;
  clinicId: string | null;
  role: string | null;
  clientId: string | null;
  rateLimitPerMinute: number;
};

const SUPPORTED_ROLES = new Set<SupportedRole>(["ADMIN", "SECRETARY", "DOCTOR"]);
const DEFAULT_USER_RATE_LIMIT_PER_MINUTE = 120;
const DEFAULT_SERVICE_RATE_LIMIT_PER_MINUTE = 240;
const DEFAULT_PUBLIC_RATE_LIMIT_PER_MINUTE = 30;

let cachedAccountsRaw = "";
let cachedAccounts: TechnicalAccountConfig[] = [];

// Lee un numero positivo desde env/config y aplica fallback si es invalido.
function parsePositiveInt(raw: string | undefined, fallback: number) {
  const parsed = Number(raw ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

// Limite por minuto para usuarios autenticados por sesion.
function getUserRateLimitPerMinute() {
  return parsePositiveInt(process.env.FHIR_RATE_LIMIT_PER_MINUTE, DEFAULT_USER_RATE_LIMIT_PER_MINUTE);
}

// Limite por minuto para cuentas tecnicas de servicio.
function getServiceRateLimitPerMinute() {
  return parsePositiveInt(
    process.env.FHIR_SERVICE_RATE_LIMIT_PER_MINUTE,
    DEFAULT_SERVICE_RATE_LIMIT_PER_MINUTE
  );
}

// Limite por minuto para trafico anonimo (sin credenciales validas).
function getPublicRateLimitPerMinute() {
  return parsePositiveInt(
    process.env.FHIR_PUBLIC_RATE_LIMIT_PER_MINUTE,
    DEFAULT_PUBLIC_RATE_LIMIT_PER_MINUTE
  );
}

// Valida y normaliza un rol a uno soportado por la capa FHIR.
function parseRole(value: unknown): SupportedRole | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase() as SupportedRole;
  return SUPPORTED_ROLES.has(normalized) ? normalized : null;
}

// Compara credenciales con tiempo constante para evitar leaks por timing.
function safeEquals(leftRaw: string, rightRaw: string) {
  const left = Buffer.from(leftRaw);
  const right = Buffer.from(rightRaw);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

// Obtiene token de servicio desde Authorization Bearer o header tecnico alternativo.
function readBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  return req.headers.get("x-fhir-service-key")?.trim() ?? "";
}

// Carga y cachea cuentas tecnicas desde FHIR_TECHNICAL_ACCOUNTS.
function loadTechnicalAccounts() {
  const raw = process.env.FHIR_TECHNICAL_ACCOUNTS ?? "[]";
  if (raw === cachedAccountsRaw) return cachedAccounts;

  cachedAccountsRaw = raw;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedAccounts = [];
      return cachedAccounts;
    }

    const normalized: TechnicalAccountConfig[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;

      const clientId = typeof item.clientId === "string" ? item.clientId.trim() : "";
      const token = typeof item.token === "string" ? item.token.trim() : "";
      const clinicId = typeof item.clinicId === "string" ? item.clinicId.trim() : "";
      const role = parseRole(item.role);
      if (!clientId || !token || !clinicId || !role) continue;

      normalized.push({
        clientId,
        token,
        clinicId,
        role,
        userId: typeof item.userId === "string" ? item.userId.trim() : undefined,
        rateLimitPerMinute: parsePositiveInt(
          typeof item.rateLimitPerMinute === "number" ? String(item.rateLimitPerMinute) : undefined,
          getServiceRateLimitPerMinute()
        ),
        enabled: item.enabled !== false,
      });
    }

    cachedAccounts = normalized;
    return cachedAccounts;
  } catch {
    cachedAccounts = [];
    return cachedAccounts;
  }
}

// Resuelve la cuenta tecnica activa para esta request, si existe.
function resolveTechnicalAccount(req: Request) {
  const token = readBearerToken(req);
  if (!token) return null;

  const requestedClientId = req.headers.get("x-fhir-client-id")?.trim() ?? "";
  const accounts = loadTechnicalAccounts().filter((account) => account.enabled !== false);
  if (!accounts.length) return null;

  if (requestedClientId) {
    const account = accounts.find((item) => item.clientId === requestedClientId);
    if (!account) return null;
    return safeEquals(account.token, token) ? account : null;
  }

  for (const account of accounts) {
    if (safeEquals(account.token, token)) return account;
  }
  return null;
}

// Requiere contexto clinico FHIR: primero cuenta tecnica, luego sesion de usuario.
export async function requireFhirClinicSession(req: Request): Promise<FhirSessionContext> {
  const technical = resolveTechnicalAccount(req);
  if (technical) {
    return {
      userId: technical.userId || `svc:${technical.clientId}`,
      clinicId: technical.clinicId,
      role: technical.role,
      authType: "service",
      clientId: technical.clientId,
      rateLimitPerMinute: technical.rateLimitPerMinute ?? getServiceRateLimitPerMinute(),
    };
  }

  const session = await requireClinicSession();
  return {
    ...session,
    authType: "user",
    clientId: undefined,
    rateLimitPerMinute: getUserRateLimitPerMinute(),
  };
}

// Devuelve actor FHIR robusto y siempre usable por la capa de auditoria/rate-limit.
export async function resolveFhirActor(req: Request): Promise<FhirActorContext> {
  try {
    const session = await requireFhirClinicSession(req);
    return {
      authType: session.authType,
      actorId: session.userId,
      clinicId: session.clinicId,
      role: session.role,
      clientId: session.clientId ?? null,
      rateLimitPerMinute: session.rateLimitPerMinute,
    };
  } catch {
    return {
      authType: "anonymous",
      actorId: "anonymous",
      clinicId: null,
      role: null,
      clientId: null,
      rateLimitPerMinute: getPublicRateLimitPerMinute(),
    };
  }
}
