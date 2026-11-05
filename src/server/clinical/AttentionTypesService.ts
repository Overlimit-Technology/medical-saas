/**
 * Tarjetas de tipo de atencion de cada profesional: las de fabrica de su especialidad, las que creo el
 * y las que un administrador compartio con su equipo. Respeta su orden y las que oculto.
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ATTENTION_TYPES,
  NOTE_FORMAT_KEYS,
  findDefaultType,
  specialtyFor,
  type AttentionBlock,
  type AttentionTypeDef,
  type NoteFormat,
  type SpecialtyKey,
} from "@/lib/clinical/attentionTypes";

export const CUSTOM_PREFIX = "custom:";

const fieldSchema = z.object({
  id: z.string().min(1).max(60).regex(/^[a-z0-9._-]+$/i),
  label: z.string().trim().min(1).max(80),
  kind: z.enum(["text", "longtext", "number", "checkbox", "list", "scale", "checklist", "date"]),
  unit: z.string().max(12).optional(),
  options: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
  placeholder: z.string().max(120).optional(),
  help: z.string().max(200).optional(),
  carry: z.boolean().optional(),
  width: z.enum(["half", "full"]).optional(),
});

const blockSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().trim().min(1).max(60),
  description: z.string().max(200).optional(),
  fields: z.array(fieldSchema).min(1).max(30),
});

export const attentionTypeInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).optional().default(""),
  kind: z.enum(["first", "followup", "closure", "procedure", "other"]).default("other"),
  noteFormat: z.enum(NOTE_FORMAT_KEYS as [NoteFormat, ...NoteFormat[]]).default("free"),
  durationMinutes: z.number().int().min(5).max(480).default(45),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#50c9d5"),
  blocks: z.array(blockSchema).max(12).default([]),
  shared: z.boolean().optional().default(false),
});

export type AttentionTypeInput = z.infer<typeof attentionTypeInputSchema>;

export type AttentionTypeView = AttentionTypeDef & { hidden: boolean; position: number; editable: boolean };

type Row = Awaited<ReturnType<typeof prisma.attentionType.findFirst>> & {};

function fromRow(row: NonNullable<Row>): AttentionTypeDef {
  return {
    key: `${CUSTOM_PREFIX}${row.id}`,
    specialty: row.profession as SpecialtyKey,
    name: row.name,
    description: row.description ?? "",
    kind: row.kind as AttentionTypeDef["kind"],
    noteFormat: row.noteFormat as NoteFormat,
    durationMinutes: row.durationMinutes,
    color: row.color,
    blocks: (row.blocks as unknown as AttentionBlock[]) ?? [],
    custom: true,
    shared: row.shared,
    ownerUserId: row.ownerUserId,
    version: row.version,
  };
}

/** Los ids de campo de un tipo propio llevan su prefijo para no chocar con los de otros tipos. */
function namespaceBlocks(blocks: AttentionTypeInput["blocks"], typeId: string): AttentionBlock[] {
  const slug = typeId.slice(-8);
  return blocks.map((block, b) => ({
    ...block,
    id: block.id || `b${b}`,
    fields: block.fields.map((field) => ({
      ...field,
      // Un campo copiado de un tipo de fabrica conserva su id para seguir mostrando el valor anterior.
      id: /^(c\.|pain\.|body\.|kine\.|nutri\.|psi\.|mat\.|to\.|dermo\.|exams\.)/.test(field.id) ? field.id : `c.${slug}.${field.id}`,
    })),
  }));
}

export class AttentionTypesService {
  /** Especialidad de un profesional segun su perfil. */
  static async specialtyOf(userId: string): Promise<SpecialtyKey> {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId },
      select: { specialty: true, profession: { select: { slug: true } } },
    });
    return specialtyFor(profile?.profession?.slug, profile?.specialty);
  }

  /** Todas las tarjetas del profesional, en su orden, incluidas las ocultas (marcadas). */
  static async listFor(params: { clinicId: string; userId: string; specialty?: SpecialtyKey }): Promise<{ specialty: SpecialtyKey; types: AttentionTypeView[] }> {
    const specialty = params.specialty ?? (await this.specialtyOf(params.userId));
    const [rows, prefs] = await Promise.all([
      prisma.attentionType.findMany({
        where: {
          clinicId: params.clinicId,
          profession: specialty,
          archivedAt: null,
          OR: [{ ownerUserId: params.userId }, { shared: true }],
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.attentionTypePref.findMany({ where: { userId: params.userId } }),
    ]);
    const prefOf = new Map(prefs.map((p) => [p.typeKey, p]));
    const defaults = DEFAULT_ATTENTION_TYPES.filter((t) => t.specialty === specialty);
    const all = [...defaults, ...rows.map(fromRow)];
    const types = all
      .map((type, index) => {
        const pref = prefOf.get(type.key);
        return {
          ...type,
          hidden: pref?.hidden ?? false,
          position: pref?.position ?? 1000 + index,
          editable: Boolean(type.custom && type.ownerUserId === params.userId),
        };
      })
      .sort((a, b) => a.position - b.position);
    return { specialty, types };
  }

  /** Resuelve una clave a su definicion, validando que el profesional pueda usarla. */
  static async resolve(params: { clinicId: string; userId: string; key: string }): Promise<AttentionTypeDef | null> {
    if (!params.key.startsWith(CUSTOM_PREFIX)) return findDefaultType(params.key);
    const row = await prisma.attentionType.findFirst({
      where: {
        id: params.key.slice(CUSTOM_PREFIX.length),
        clinicId: params.clinicId,
        OR: [{ ownerUserId: params.userId }, { shared: true }],
      },
    });
    return row ? fromRow(row) : null;
  }

  static async create(params: { clinicId: string; userId: string; isAdmin: boolean; input: AttentionTypeInput }) {
    const specialty = await this.specialtyOf(params.userId);
    const created = await prisma.attentionType.create({
      data: {
        clinicId: params.clinicId,
        ownerUserId: params.userId,
        profession: specialty,
        name: params.input.name,
        description: params.input.description || null,
        kind: params.input.kind,
        noteFormat: params.input.noteFormat,
        durationMinutes: params.input.durationMinutes,
        color: params.input.color,
        shared: params.isAdmin && params.input.shared,
        blocks: [],
        fields: [],
      },
    });
    const updated = await prisma.attentionType.update({
      where: { id: created.id },
      data: { blocks: namespaceBlocks(params.input.blocks, created.id) as never },
    });
    return fromRow(updated);
  }

  /** Editar sube la version; las consultas ya registradas conservan su copia de la estructura. */
  static async update(params: { clinicId: string; userId: string; isAdmin: boolean; id: string; input: AttentionTypeInput }) {
    const row = await prisma.attentionType.findFirst({ where: { id: params.id, clinicId: params.clinicId, archivedAt: null } });
    if (!row) throw new Error("Tipo de atencion no encontrado.");
    if (row.ownerUserId !== params.userId && !params.isAdmin) throw new Error("Solo quien creo este tipo puede editarlo.");
    const updated = await prisma.attentionType.update({
      where: { id: row.id },
      data: {
        name: params.input.name,
        description: params.input.description || null,
        kind: params.input.kind,
        noteFormat: params.input.noteFormat,
        durationMinutes: params.input.durationMinutes,
        color: params.input.color,
        shared: params.isAdmin ? params.input.shared : row.shared,
        blocks: namespaceBlocks(params.input.blocks, row.id) as never,
        version: { increment: 1 },
      },
    });
    return fromRow(updated);
  }

  static async archive(params: { clinicId: string; userId: string; isAdmin: boolean; id: string }) {
    const row = await prisma.attentionType.findFirst({ where: { id: params.id, clinicId: params.clinicId, archivedAt: null } });
    if (!row) throw new Error("Tipo de atencion no encontrado.");
    if (row.ownerUserId !== params.userId && !params.isAdmin) throw new Error("Solo quien creo este tipo puede eliminarlo.");
    await prisma.attentionType.update({ where: { id: row.id }, data: { archivedAt: new Date() } });
  }

  /** Guarda orden y visibilidad de las tarjetas del profesional. */
  static async savePrefs(userId: string, prefs: Array<{ key: string; hidden: boolean; position: number }>) {
    await prisma.$transaction(
      prefs.map((p) =>
        prisma.attentionTypePref.upsert({
          where: { userId_typeKey: { userId, typeKey: p.key } },
          update: { hidden: p.hidden, position: p.position },
          create: { userId, typeKey: p.key, hidden: p.hidden, position: p.position },
        })
      )
    );
  }
}
