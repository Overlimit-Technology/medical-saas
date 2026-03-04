import { randomUUID } from "node:crypto";
import { FhirLinkResourceType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Identificador externo FHIR (system + value) usado para resolver correlaciones.
export type FhirLinkIdentifier = {
  system: string;
  value: string;
};

// Datos necesarios para crear o reutilizar una correlacion interna <-> FHIR.
export type EnsureFhirLinkInput = {
  clinicId: string;
  resourceType: FhirLinkResourceType;
  internalId: string;
  fhirId?: string | null;
  identifier?: FhirLinkIdentifier | null;
};

// Datos necesarios para resolver un internalId por fhirId o identifier.
export type ResolveFhirLinkInput = {
  clinicId: string;
  resourceType: FhirLinkResourceType;
  fhirId?: string | null;
  identifier?: FhirLinkIdentifier | null;
};

// Normaliza strings para evitar guardar valores vacios.
function clean(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

// Normaliza el identificador externo a una llave unica y estable.
export function buildIdentifierKey(identifier: FhirLinkIdentifier | null | undefined) {
  const system = clean(identifier?.system)?.toLowerCase();
  const value = clean(identifier?.value);
  if (!system || !value) return null;
  return `${system}|${value}`;
}

// Normaliza el identificador y calcula la llave unica system|value.
function normalizeIdentifier(identifier: FhirLinkIdentifier | null | undefined) {
  const system = clean(identifier?.system);
  const value = clean(identifier?.value);
  const key = buildIdentifierKey(identifier);
  if (!system || !value || !key) return null;
  return { system, value, key };
}

// Traduce errores de unicidad de Prisma a mensajes funcionales claros.
function mapUniqueConstraintMessage(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return null;
  }

  const target = Array.isArray(error.meta?.target)
    ? error.meta?.target.join(",")
    : typeof error.meta?.target === "string"
      ? error.meta?.target
      : "desconocido";

  if (target.includes("fhirId")) {
    return "El fhirId ya existe para este recurso y clinica.";
  }
  if (target.includes("internalId")) {
    return "El internalId ya tiene una correlacion FHIR para este recurso y clinica.";
  }
  if (target.includes("identifierKey")) {
    return "El identifier ya esta asociado a otro recurso interno en esta clinica.";
  }
  return "No se pudo guardar la correlacion FHIR por restriccion unica.";
}

export class FhirLinkService {
  // Crea o reutiliza una correlacion estable para un recurso interno.
  static async ensureLink(input: EnsureFhirLinkInput) {
    const clinicId = clean(input.clinicId);
    const internalId = clean(input.internalId);
    if (!clinicId || !internalId) {
      throw new Error("clinicId e internalId son obligatorios para correlacion FHIR.");
    }

    const providedFhirId = clean(input.fhirId);
    const normalizedIdentifier = normalizeIdentifier(input.identifier);

    const existing = await prisma.fhirLink.findUnique({
      where: {
        clinicId_resourceType_internalId: {
          clinicId,
          resourceType: input.resourceType,
          internalId,
        },
      },
    });

    if (existing) {
      if (providedFhirId && existing.fhirId !== providedFhirId) {
        throw new Error("El internalId ya esta correlacionado con otro fhirId.");
      }

      if (normalizedIdentifier) {
        if (existing.identifierKey && existing.identifierKey !== normalizedIdentifier.key) {
          throw new Error("El internalId ya esta correlacionado con otro identifier.");
        }

        if (!existing.identifierKey) {
          try {
            return await prisma.fhirLink.update({
              where: { id: existing.id },
              data: {
                identifierSystem: normalizedIdentifier.system,
                identifierValue: normalizedIdentifier.value,
                identifierKey: normalizedIdentifier.key,
              },
            });
          } catch (error) {
            const message = mapUniqueConstraintMessage(error);
            if (message) throw new Error(message);
            throw error;
          }
        }
      }

      return existing;
    }

    const fhirId = providedFhirId ?? randomUUID().toLowerCase();

    try {
      return await prisma.fhirLink.create({
        data: {
          clinicId,
          resourceType: input.resourceType,
          internalId,
          fhirId,
          identifierSystem: normalizedIdentifier?.system ?? null,
          identifierValue: normalizedIdentifier?.value ?? null,
          identifierKey: normalizedIdentifier?.key ?? null,
        },
      });
    } catch (error) {
      const message = mapUniqueConstraintMessage(error);
      if (message) throw new Error(message);
      throw error;
    }
  }

  // Resuelve internalId cuando llega un fhirId.
  static async resolveInternalIdByFhirId(input: {
    clinicId: string;
    resourceType: FhirLinkResourceType;
    fhirId: string;
  }) {
    const clinicId = clean(input.clinicId);
    const fhirId = clean(input.fhirId);
    if (!clinicId || !fhirId) return null;

    const link = await prisma.fhirLink.findUnique({
      where: {
        clinicId_resourceType_fhirId: {
          clinicId,
          resourceType: input.resourceType,
          fhirId,
        },
      },
      select: { internalId: true },
    });

    return link?.internalId ?? null;
  }

  // Resuelve internalId cuando llega un identifier (system|value).
  static async resolveInternalIdByIdentifier(input: {
    clinicId: string;
    resourceType: FhirLinkResourceType;
    identifier: FhirLinkIdentifier;
  }) {
    const clinicId = clean(input.clinicId);
    const identifierKey = buildIdentifierKey(input.identifier);
    if (!clinicId || !identifierKey) return null;

    const link = await prisma.fhirLink.findUnique({
      where: {
        clinicId_resourceType_identifierKey: {
          clinicId,
          resourceType: input.resourceType,
          identifierKey,
        },
      },
      select: { internalId: true },
    });

    return link?.internalId ?? null;
  }

  // Resolucion deterministica: primero fhirId, si no existe usa identifier.
  static async resolveInternalId(input: ResolveFhirLinkInput) {
    const byFhirId = input.fhirId
      ? await this.resolveInternalIdByFhirId({
          clinicId: input.clinicId,
          resourceType: input.resourceType,
          fhirId: input.fhirId,
        })
      : null;

    if (byFhirId) return byFhirId;
    if (!input.identifier) return null;

    return this.resolveInternalIdByIdentifier({
      clinicId: input.clinicId,
      resourceType: input.resourceType,
      identifier: input.identifier,
    });
  }

  // Obtiene la correlacion actual a partir del internalId.
  static async getByInternalId(input: {
    clinicId: string;
    resourceType: FhirLinkResourceType;
    internalId: string;
  }) {
    const clinicId = clean(input.clinicId);
    const internalId = clean(input.internalId);
    if (!clinicId || !internalId) return null;

    return prisma.fhirLink.findUnique({
      where: {
        clinicId_resourceType_internalId: {
          clinicId,
          resourceType: input.resourceType,
          internalId,
        },
      },
    });
  }
}
