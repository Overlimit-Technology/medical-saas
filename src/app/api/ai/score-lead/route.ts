import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { isAiRateLimited } from "@/server/ai/rateLimit";
import { scoreLead } from "@/server/ai/features/scoreLead";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  leadId: z.string().min(1),
});

/** Analiza un lead del CRM y guarda puntaje, temperatura y siguiente paso sugerido. */
export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    if (isAiRateLimited(session.userId)) {
      return NextResponse.json(
        { ok: false, error: "Demasiadas solicitudes. Espera un minuto." },
        { status: 429 }
      );
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }

    const score = await scoreLead(session.clinicId, parsed.data.leadId);
    return NextResponse.json({ ok: true, score });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo analizar el lead.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
