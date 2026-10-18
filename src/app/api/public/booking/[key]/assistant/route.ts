import { NextResponse } from "next/server";
import { z } from "zod";
import { BookingError, BookingService } from "@/server/booking/BookingService";
import { isPublicRateLimited } from "@/server/booking/publicRateLimit";
import { runBookingAssistant } from "@/server/ai/features/bookingAssistant";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(600),
      })
    )
    .min(1)
    .max(12),
});

// Tope diario de usos de IA por sede para que un abuso no agote la cuota ni genere costos.
const DAILY_LIMIT_PER_CLINIC = 300;
const daily = new Map<string, { day: string; count: number }>();

function consumeDaily(clinicId: string) {
  const day = new Date().toISOString().slice(0, 10);
  const current = daily.get(clinicId);
  if (!current || current.day !== day) {
    daily.set(clinicId, { day, count: 1 });
    return true;
  }
  if (current.count >= DAILY_LIMIT_PER_CLINIC) return false;
  current.count += 1;
  return true;
}

/**
 * Asistente de reservas. Interpreta el pedido y propone horas reales.
 * No crea reservas: eso lo hace /book con confirmacion explicita de la persona.
 */
export async function POST(req: Request, { params }: { params: { key: string } }) {
  try {
    if (isPublicRateLimited(req, "assistant")) {
      return NextResponse.json(
        { ok: false, error: "Demasiadas consultas. Espera un minuto o elige la hora manualmente." },
        { status: 429 }
      );
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }

    const clinic = await BookingService.resolveClinic(params.key);

    if (!consumeDaily(clinic.clinicId)) {
      return NextResponse.json(
        { ok: false, error: "El asistente no esta disponible hoy. Elige la hora manualmente." },
        { status: 429 }
      );
    }

    const result = await runBookingAssistant({ clinic, messages: parsed.data.messages });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
    }
    console.error("[booking] error del asistente:", error);
    const message =
      error instanceof Error && error.message.startsWith("No pude")
        ? error.message
        : "El asistente no pudo responder. Elige la hora manualmente.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
