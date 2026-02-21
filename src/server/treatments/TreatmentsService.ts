import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CreateTreatmentInput = {
  name: string;
  price: number;
};

type UpdateTreatmentInput = {
  name: string;
  price: number;
};

function toNumber(value: { toString(): string } | number) {
  return Number(typeof value === "number" ? value : value.toString());
}

function parseNumericId(id: string) {
  if (!/^\d+$/.test(id)) return null;
  const parsed = Number(id);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function mapUniqueError(error: unknown): Error | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (error.code !== "P2002") return null;

  const targets = Array.isArray(error.meta?.target) ? error.meta.target.map(String) : [];
  if (targets.includes("id")) {
    return new Error("El id del tratamiento ya existe.");
  }
  if (targets.includes("name")) {
    return new Error("El nombre del tratamiento ya existe.");
  }
  return new Error("Ya existe un tratamiento con esos datos.");
}

export class TreatmentsService {
  private static async normalizeLegacyIds(tx: Prisma.TransactionClient) {
    const rows = await tx.treatment.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true },
    });

    const usedNumericIds = new Set<number>();
    const legacyIds: string[] = [];
    let maxNumericId = 0;

    for (const row of rows) {
      const numericId = parseNumericId(row.id);
      if (numericId === null) {
        legacyIds.push(row.id);
        continue;
      }

      usedNumericIds.add(numericId);
      if (numericId > maxNumericId) maxNumericId = numericId;
    }

    if (legacyIds.length === 0) return;

    let nextId = maxNumericId + 1;
    for (const legacyId of legacyIds) {
      while (usedNumericIds.has(nextId)) {
        nextId += 1;
      }

      await tx.treatment.update({
        where: { id: legacyId },
        data: { id: `${nextId}` },
      });

      usedNumericIds.add(nextId);
      nextId += 1;
    }
  }

  private static async getNextNumericId(tx: Prisma.TransactionClient) {
    const ids = await tx.treatment.findMany({
      select: { id: true },
    });

    let maxNumericId = 0;
    for (const row of ids) {
      const numericId = parseNumericId(row.id);
      if (numericId !== null && numericId > maxNumericId) {
        maxNumericId = numericId;
      }
    }

    return `${maxNumericId + 1}`;
  }

  static async list() {
    const items = await prisma.$transaction(async (tx) => {
      await this.normalizeLegacyIds(tx);

      return tx.treatment.findMany({
        select: {
          id: true,
          name: true,
          price: true,
        },
      });
    });

    return items
      .map((item) => ({
        ...item,
        price: toNumber(item.price),
      }))
      .sort((a, b) => {
        const aId = parseNumericId(a.id) ?? Number.MAX_SAFE_INTEGER;
        const bId = parseNumericId(b.id) ?? Number.MAX_SAFE_INTEGER;
        if (aId !== bId) return aId - bId;
        return a.name.localeCompare(b.name, "es");
      });
  }

  static async create(input: CreateTreatmentInput) {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const item = await prisma.$transaction(async (tx) => {
          await this.normalizeLegacyIds(tx);
          const nextId = await this.getNextNumericId(tx);

          return tx.treatment.create({
            data: {
              id: nextId,
              name: input.name.trim(),
              price: input.price,
            },
            select: {
              id: true,
              name: true,
              price: true,
            },
          });
        });

        return {
          ...item,
          price: toNumber(item.price),
        };
      } catch (error) {
        const mapped = mapUniqueError(error);
        if (!mapped) throw error;

        const isIdCollision = mapped.message.includes("id");
        if (isIdCollision && attempt < maxAttempts) {
          continue;
        }
        throw mapped;
      }
    }

    throw new Error("No se pudo generar un id numerico para el tratamiento.");
  }

  static async update(id: string, input: UpdateTreatmentInput) {
    const current = await prisma.treatment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!current) {
      throw new Error("Tratamiento no encontrado.");
    }

    try {
      const item = await prisma.treatment.update({
        where: { id },
        data: {
          name: input.name.trim(),
          price: input.price,
        },
        select: {
          id: true,
          name: true,
          price: true,
        },
      });

      return {
        ...item,
        price: toNumber(item.price),
      };
    } catch (error) {
      const mapped = mapUniqueError(error);
      if (mapped) throw mapped;
      throw error;
    }
  }
}
