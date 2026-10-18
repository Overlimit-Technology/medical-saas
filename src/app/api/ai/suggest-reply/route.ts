import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { isAiRateLimited } from "@/server/ai/rateLimit";
import { buildClinicContext, suggestReply } from "@/server/ai/features/suggestReply";
import { MetaChatService } from "@/server/chat-meta/MetaChatService";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  conversationId: z.string().min(1),
});

/**
 * Sugiere una respuesta para una conversacion del inbox. Nunca envia nada: el humano revisa y envia.
 * Solo se mandan al modelo los ultimos mensajes (con RUT, correos y telefonos ocultos)
 * y datos publicos de la clinica. No se envia el nombre del contacto.
 */
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

    const [turns, clinicContext] = await Promise.all([
      MetaChatService.getRecentTurnsForAi(session.clinicId, session.userId, parsed.data.conversationId),
      buildClinicContext(session.clinicId),
    ]);

    const suggestion = await suggestReply({ turns, clinicContext });
    return NextResponse.json({ ok: true, suggestion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo sugerir una respuesta.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
