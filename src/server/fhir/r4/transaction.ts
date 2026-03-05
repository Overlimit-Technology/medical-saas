import { randomUUID } from "node:crypto";
import { AuditService } from "@/server/audit/AuditService";
import { resolveFhirActor } from "@/server/fhir/r4/access";
import { redactSensitiveText, toAuditDetail, maskIpForLog } from "@/server/fhir/r4/logging";
import { checkRateLimit, toRateLimitHeaders, type RateLimitCheckResult } from "@/server/fhir/r4/rateLimit";
import { fhirErrorResponse, mapErrorToHttpStatus } from "@/server/fhir/r4/response";

type FhirRouteHandler<TArgs extends [Request, ...unknown[]]> = (...args: TArgs) => Promise<Response>;

export type FhirTransactionOptions = {
  interaction: string;
  rateLimitScope?: string;
};

const MAX_QUERY_KEYS_IN_AUDIT = 20;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9_.:\-]{8,120}$/;

// Reutiliza correlation-id de entrada si es valido; si no, crea uno nuevo.
function resolveCorrelationId(req: Request) {
  const incoming = req.headers.get("x-correlation-id")?.trim();
  if (incoming && CORRELATION_ID_PATTERN.test(incoming)) return incoming;

  const requestId = req.headers.get("x-request-id")?.trim();
  if (requestId && CORRELATION_ID_PATTERN.test(requestId)) return requestId;

  return randomUUID();
}

// Obtiene IP del cliente desde headers de proxy de forma defensiva.
function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  return req.headers.get("x-real-ip")?.trim() ?? null;
}

// Construye key estable de rate-limit segun tipo de actor y alcance.
function buildRateLimitKey(
  scope: string,
  actor: Awaited<ReturnType<typeof resolveFhirActor>>,
  ip: string | null
) {
  const clinicScope = actor.clinicId ?? "no-clinic";
  if (actor.authType === "service") {
    const clientId = actor.clientId ?? actor.actorId;
    return `${scope}:${clinicScope}:service:${clientId}`;
  }
  if (actor.authType === "user") {
    return `${scope}:${clinicScope}:user:${actor.actorId}`;
  }
  return `${scope}:public:${maskIpForLog(ip)}`;
}

// Clona la respuesta original agregando headers sin perder body/status.
function cloneWithHeaders(response: Response, extraHeaders: Record<string, string>) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(extraHeaders)) {
    if (!value) continue;
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Extrae diagnostics de OperationOutcome para auditoria de errores.
async function extractOutcomeDiagnostics(response: Response) {
  if (response.status < 400) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("json")) return null;

  try {
    const payload = (await response.clone().json()) as Record<string, unknown>;
    if (payload?.resourceType !== "OperationOutcome") return null;
    if (!Array.isArray(payload.issue)) return null;
    const firstIssue = payload.issue[0] as Record<string, unknown> | undefined;
    if (!firstIssue) return null;
    if (typeof firstIssue.diagnostics !== "string") return null;
    return redactSensitiveText(firstIssue.diagnostics);
  } catch {
    return null;
  }
}

// Calcula decision de throttling para la request actual.
function getRateLimitResult(
  options: FhirTransactionOptions,
  actor: Awaited<ReturnType<typeof resolveFhirActor>>,
  req: Request
) {
  const url = new URL(req.url);
  const scope = options.rateLimitScope ?? url.pathname;
  const ip = getClientIp(req);
  const key = buildRateLimitKey(scope, actor, ip);
  const result = checkRateLimit(key, actor.rateLimitPerMinute);
  return {
    result,
    ip,
  };
}

// Arma detalle estructurado de auditoria HL7/FHIR para un request/response.
async function buildAuditDetail(
  req: Request,
  options: FhirTransactionOptions,
  actor: Awaited<ReturnType<typeof resolveFhirActor>>,
  correlationId: string,
  response: Response,
  rateLimit: RateLimitCheckResult,
  startedAt: number,
  handlerError: string | null
) {
  const url = new URL(req.url);
  const diagnostics = handlerError ?? (await extractOutcomeDiagnostics(response));
  const queryKeys = Array.from(url.searchParams.keys()).slice(0, MAX_QUERY_KEYS_IN_AUDIT);
  return {
    timestamp: new Date().toISOString(),
    correlationId,
    interaction: options.interaction,
    request: {
      method: req.method.toUpperCase(),
      path: url.pathname,
      queryKeys,
    },
    origin: {
      ip: maskIpForLog(getClientIp(req)),
      userAgent: redactSensitiveText(req.headers.get("user-agent") ?? ""),
    },
    destination: "medigest-fhir-r4",
    actor: {
      type: actor.authType,
      actorId: actor.actorId,
      clinicId: actor.clinicId,
      role: actor.role,
      clientId: actor.clientId,
    },
    result: {
      status: response.status,
      outcome: response.status === 429 ? "throttled" : response.status < 400 ? "success" : "error",
      durationMs: Date.now() - startedAt,
      rateLimit: {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        resetAtEpochSeconds: rateLimit.resetAtEpochSeconds,
      },
    },
    error: diagnostics || null,
  };
}

// Persiste el evento transaccional sin interrumpir el flujo API en caso de falla.
async function auditTransaction(
  req: Request,
  options: FhirTransactionOptions,
  actor: Awaited<ReturnType<typeof resolveFhirActor>>,
  correlationId: string,
  response: Response,
  rateLimit: RateLimitCheckResult,
  startedAt: number,
  handlerError: string | null
) {
  try {
    const detail = await buildAuditDetail(
      req,
      options,
      actor,
      correlationId,
      response,
      rateLimit,
      startedAt,
      handlerError
    );
    const event = response.status === 429 ? "hl7.fhir.rate_limit.blocked" : "hl7.fhir.transaction";
    await AuditService.log(event, actor.actorId, toAuditDetail(detail));
  } catch {
    // Avoid breaking API flow if audit storage fails.
  }
}

// Wrapper transversal para endpoints FHIR: throttling + correlacion + auditoria.
export function withFhirTransaction<TArgs extends [Request, ...unknown[]]>(
  options: FhirTransactionOptions,
  handler: FhirRouteHandler<TArgs>
) {
  return async (...args: TArgs): Promise<Response> => {
    const [req] = args;
    const startedAt = Date.now();
    const correlationId = resolveCorrelationId(req);
    const actor = await resolveFhirActor(req);
    const { result: rateLimit } = getRateLimitResult(options, actor, req);

    let response: Response;
    let handlerError: string | null = null;

    if (!rateLimit.allowed) {
      response = fhirErrorResponse(429, "Rate limit exceeded for this client.", "throttled");
    } else {
      try {
        response = await handler(...args);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected FHIR transaction error.";
        handlerError = redactSensitiveText(message);
        response = fhirErrorResponse(mapErrorToHttpStatus(message), message);
      }
    }

    const responseWithHeaders = cloneWithHeaders(response, {
      "X-Correlation-Id": correlationId,
      ...toRateLimitHeaders(rateLimit),
    });

    await auditTransaction(
      req,
      options,
      actor,
      correlationId,
      responseWithHeaders,
      rateLimit,
      startedAt,
      handlerError
    );

    return responseWithHeaders;
  };
}
