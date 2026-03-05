import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireSession";
import { requireFhirClinicSession } from "@/server/fhir/r4/access";
import { fhirJsonResponse } from "@/server/fhir/r4/http";
import { withFhirTransaction } from "@/server/fhir/r4/transaction";

type AuditDetail = {
  correlationId?: unknown;
  actor?: {
    clinicId?: unknown;
    actorId?: unknown;
    type?: unknown;
  };
  request?: {
    method?: unknown;
    path?: unknown;
  };
  result?: {
    status?: unknown;
    durationMs?: unknown;
    outcome?: unknown;
  };
  error?: unknown;
};

// Normaliza _count con limites de proteccion para consulta de bitacora.
function clampCount(raw: string | null) {
  const parsed = Number(raw ?? "50");
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(200, Math.floor(parsed)));
}

// Parsea fecha ISO desde query string; null si es invalida.
function toDate(raw: string | null) {
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

// Convierte el JSON de AuditLog.detail en objeto tipado utilizable.
function parseAuditDetail(detail: string | null): AuditDetail | null {
  if (!detail) return null;
  try {
    const parsed = JSON.parse(detail) as AuditDetail;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

// Utilidad para convertir valores desconocidos a string segura.
function toString(value: unknown) {
  return typeof value === "string" ? value : "";
}

// Utilidad para convertir valores desconocidos a number seguro.
function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Mapea HTTP status a codigo AuditEvent.outcome.
function toAuditOutcome(httpStatus: number) {
  if (httpStatus < 400) return "0";
  if (httpStatus === 429) return "4";
  return "8";
}

// Mapea metodo HTTP a accion de auditoria FHIR.
function toAuditAction(method: string) {
  switch (method.toUpperCase()) {
    case "POST":
      return "C";
    case "PUT":
    case "PATCH":
      return "U";
    case "DELETE":
      return "D";
    case "GET":
    default:
      return "R";
  }
}

export const GET = withFhirTransaction(
  {
    interaction: "Audit.search",
    rateLimitScope: "/api/fhir/r4/_audit",
  },
  async (req: Request) => {
    // Acceso restringido: solo admin puede consultar bitacora HL7.
    const session = await requireFhirClinicSession(req);
    requireRole(session.role, ["ADMIN"]);

    const { searchParams, origin } = new URL(req.url);
    const count = clampCount(searchParams.get("_count"));
    const filterCorrelation = toString(searchParams.get("correlation"));
    const filterOutcome = toString(searchParams.get("outcome")).toLowerCase();
    const filterStatus = searchParams.get("status");
    const filterStatusNumber = filterStatus ? toNumber(filterStatus) : null;
    const from = toDate(searchParams.get("from"));
    const to = toDate(searchParams.get("to"));

    const rawLogs = await prisma.auditLog.findMany({
      where: {
        event: {
          in: ["hl7.fhir.transaction", "hl7.fhir.rate_limit.blocked"],
        },
      },
      orderBy: {
        occurredAt: "desc",
      },
      take: Math.max(count * 5, 200),
    });

    const selected = [];
    for (const log of rawLogs) {
      const detail = parseAuditDetail(log.detail);
      if (!detail) continue;

      const clinicId = toString(detail.actor?.clinicId);
      if (clinicId && clinicId !== session.clinicId) continue;

      if (from && log.occurredAt < from) continue;
      if (to && log.occurredAt > to) continue;

      const correlationId = toString(detail.correlationId);
      if (filterCorrelation && correlationId !== filterCorrelation) continue;

      const status = toNumber(detail.result?.status);
      if (filterStatusNumber !== null && status !== filterStatusNumber) continue;

      const outcome = toString(detail.result?.outcome).toLowerCase();
      if (filterOutcome && outcome !== filterOutcome) continue;

      const method = toString(detail.request?.method);
      const path = toString(detail.request?.path);
      const actorId = toString(detail.actor?.actorId) || log.author;
      const actorType = toString(detail.actor?.type) || "unknown";
      const durationMs = toNumber(detail.result?.durationMs);
      const error = toString(detail.error);

      selected.push({
        resourceType: "AuditEvent",
        id: log.id,
        recorded: log.occurredAt.toISOString(),
        action: toAuditAction(method),
        outcome: toAuditOutcome(status),
        type: {
          system: "http://terminology.hl7.org/CodeSystem/audit-event-type",
          code: "rest",
          display: "RESTful Operation",
        },
        agent: [
          {
            requestor: true,
            who: {
              display: actorId,
            },
            type: {
              text: actorType,
            },
          },
        ],
        source: {
          observer: {
            display: "medigest-fhir-r4",
          },
        },
        entity: [
          {
            name: path,
            description: `${method.toUpperCase()} ${path}`,
            detail: [
              {
                type: "correlation-id",
                valueString: correlationId,
              },
              {
                type: "http-status",
                valueString: String(status),
              },
              {
                type: "duration-ms",
                valueString: String(durationMs),
              },
              ...(error
                ? [
                    {
                      type: "error",
                      valueString: error,
                    },
                  ]
                : []),
            ],
          },
        ],
      });

      if (selected.length >= count) break;
    }

    const bundle = {
      resourceType: "Bundle",
      type: "searchset",
      total: selected.length,
      entry: selected.map((resource) => ({
        fullUrl: `${origin}/api/fhir/r4/_audit/${resource.id}`,
        resource,
        search: {
          mode: "match",
        },
      })),
    };

    return fhirJsonResponse(bundle, 200);
  }
);
