import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { isAiRateLimited } from "@/server/ai/rateLimit";
import {
  generateVoiceDraft,
  isAllowedAudioType,
  MAX_AUDIO_BYTES,
} from "@/server/ai/features/voiceDraft";

export const dynamic = "force-dynamic";

/**
 * Prototipo: recibe una grabacion (campo "audio"), la transcribe y devuelve un borrador de evolucion.
 * El audio se envia al proveedor en memoria y no se guarda en ningun lado.
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

    const form = await req.formData();
    const audio = form.get("audio");

    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ ok: false, error: "No se recibio ningun audio." }, { status: 400 });
    }
    if (!isAllowedAudioType(audio.type)) {
      return NextResponse.json({ ok: false, error: "Formato de audio no soportado." }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { ok: false, error: "El audio es demasiado largo. Graba menos de 2 minutos." },
        { status: 400 }
      );
    }

    const base64 = Buffer.from(await audio.arrayBuffer()).toString("base64");
    const result = await generateVoiceDraft({ mimeType: audio.type, base64 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar el audio.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
