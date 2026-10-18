import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { generateEvolutionDraft } from "@/server/ai/features/evolutionDraft";
import { isAiRateLimited } from "@/server/ai/rateLimit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  notes: z
    .string()
    .trim()
    .min(10, "Escribe al menos una frase con las notas de la consulta.")
    .max(4000, "Las notas son demasiado largas (maximo 4000 caracteres)."),
});

/**
 * Prototipo: genera un borrador de evolucion a partir de notas libres.
 * Solo se envia el texto de las notas (nunca nombre, RUN ni otros datos del paciente).
 */
export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["DOCTOR"]);

    if (isAiRateLimited(session.userId)) {
      return NextResponse.json(
        { ok: false, error: "Demasiadas solicitudes. Espera un minuto." },
        { status: 429 }
      );
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos invalidos." },
        { status: 400 }
      );
    }

    const result = await generateEvolutionDraft(parsed.data.notes);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar el borrador.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
