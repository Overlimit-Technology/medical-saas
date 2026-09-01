import { z } from "zod";

/**
 * Contratos de entrada de la consulta. Viven aparte de las rutas porque el
 * borrador se envia tanto al autoguardar como al cerrar.
 *
 * Ambos mapas viajan como texto: las claves desconocidas y el rango de cada
 * signo vital los resuelve ConsultationsService, que es quien conoce el
 * vocabulario clinico.
 */
export const consultationDraftSchema = z.object({
  sections: z.record(z.string(), z.string()).default({}),
  vitals: z.record(z.string(), z.string()).default({}),
});

const followUpNotes = z.string().trim().max(250).nullable().optional();

/** Control unico: "vuelve en X". */
const followUpSingleSchema = z.object({
  mode: z.literal("single"),
  startAt: z.string().min(1),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  boxId: z.string().min(1),
  notes: followUpNotes,
});

/** Serie de sesiones: "plan de N citas cada X dias". */
const followUpPlanSchema = z.object({
  mode: z.literal("plan"),
  name: z.string().trim().min(1).max(120),
  startAt: z.string().min(1),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  boxId: z.string().min(1),
  totalSessions: z.coerce.number().int().min(2).max(90),
  frequencyDays: z.coerce.number().int().min(1).max(60),
  treatmentIds: z.array(z.string().min(1)).min(1),
  notes: followUpNotes,
});

const chargeSchema = z.object({
  treatmentId: z.string().min(1),
  amount: z.coerce.number().positive(),
  status: z.enum(["PENDING", "PAID", "WAIVED"]),
  notes: z.string().trim().max(250).nullable().optional(),
});

export const consultationClosureSchema = z.object({
  draft: consultationDraftSchema,
  followUp: z
    .discriminatedUnion("mode", [followUpSingleSchema, followUpPlanSchema])
    .nullable()
    .default(null),
  charge: chargeSchema.nullable().default(null),
  outcome: z.enum(["COMPLETED", "NO_SHOW"]).default("COMPLETED"),
});
