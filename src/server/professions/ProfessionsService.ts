import { prisma } from "@/lib/prisma";

export type ProfessionItem = { id: string; name: string; isGlobal: boolean };

const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

export function professionSlug(name: string) {
  // "Psicólogo/a" y "Psicólogo" son la misma profesión: se ignora el sufijo de género.
  return name
    .replace(/\/\s*[ao](?![a-z])/gi, "")
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export class ProfessionsService {
  /** Catalogo global mas las profesiones propias de la sede. */
  static async list(clinicId: string): Promise<ProfessionItem[]> {
    const rows = await prisma.profession.findMany({
      where: { isActive: true, OR: [{ clinicId: null }, { clinicId }] },
      select: { id: true, name: true, clinicId: true },
      orderBy: { name: "asc" },
    });
    return rows
      .map((row) => ({ id: row.id, name: row.name, isGlobal: row.clinicId === null }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  /** Crea una profesion propia de la sede ("Otra"). Si ya existe una igual (global o de la sede) la reutiliza. */
  static async createForClinic(clinicId: string, rawName: string): Promise<ProfessionItem> {
    const name = rawName.trim().replace(/\s+/g, " ");
    const slug = professionSlug(name);
    if (!name || !slug) throw new Error("El nombre de la profesion no es valido.");

    const existing = await prisma.profession.findFirst({
      where: { slug, OR: [{ clinicId: null }, { clinicId }] },
      select: { id: true, name: true, clinicId: true, isActive: true },
    });
    if (existing) {
      if (!existing.isActive) {
        await prisma.profession.update({ where: { id: existing.id }, data: { isActive: true } });
      }
      return { id: existing.id, name: existing.name, isGlobal: existing.clinicId === null };
    }
    const created = await prisma.profession.create({ data: { clinicId, name, slug } });
    return { id: created.id, name: created.name, isGlobal: false };
  }

  static async rename(clinicId: string, id: string, rawName: string): Promise<ProfessionItem> {
    const name = rawName.trim().replace(/\s+/g, " ");
    const slug = professionSlug(name);
    if (!name || !slug) throw new Error("El nombre de la profesion no es valido.");
    const current = await prisma.profession.findFirst({ where: { id, clinicId } });
    if (!current) throw new Error("Profesion no encontrada.");
    const clash = await prisma.profession.findFirst({
      where: { slug, id: { not: id }, OR: [{ clinicId: null }, { clinicId }] },
      select: { id: true },
    });
    if (clash) throw new Error("Ya existe una profesion con ese nombre.");
    const updated = await prisma.profession.update({ where: { id }, data: { name, slug } });
    return { id: updated.id, name: updated.name, isGlobal: false };
  }

  /** Solo se eliminan profesiones propias de la sede; quienes la tenian quedan sin profesion. */
  static async remove(clinicId: string, id: string) {
    const current = await prisma.profession.findFirst({ where: { id, clinicId } });
    if (!current) throw new Error("Profesion no encontrada.");
    await prisma.profession.delete({ where: { id } });
  }

  /**
   * Resuelve la profesion elegida en un formulario: `professionId` existente o `professionName` ("Otra").
   * Devuelve null si no se indico ninguna. Falla si el id no es global ni de alguna de las sedes dadas.
   */
  static async resolve(
    clinicIds: string[],
    input: { professionId?: string | null; professionName?: string | null }
  ): Promise<{ id: string; name: string } | null> {
    if (input.professionId) {
      const found = await prisma.profession.findFirst({
        where: {
          id: input.professionId,
          isActive: true,
          OR: [{ clinicId: null }, { clinicId: { in: clinicIds } }],
        },
        select: { id: true, name: true },
      });
      if (!found) throw new Error("La profesion seleccionada no es valida.");
      return found;
    }
    if (input.professionName?.trim()) {
      const clinicId = clinicIds[0];
      if (!clinicId) throw new Error("Falta la sede para crear la profesion.");
      const created = await this.createForClinic(clinicId, input.professionName);
      return { id: created.id, name: created.name };
    }
    return null;
  }
}
