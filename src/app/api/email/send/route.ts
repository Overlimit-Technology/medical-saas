import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { deliverEmail } from "@/server/notifications/mailer";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    to: z.string().email().max(200),
    subject: z.string().min(1).max(200),
    text: z.string().max(20000).optional(),
    html: z.string().max(100000).optional(),
  })
  .refine((value) => Boolean(value.text || value.html), {
    message: "Se requieren: to, subject y (text o html)",
  });

// Limite por usuario: esta ruta usa la cuenta de correo de la plataforma.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function isRateLimited(userId: string) {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(userId, recent);
    return true;
  }
  recent.push(now);
  hits.set(userId, recent);
  return false;
}

/**
 * Envio manual de correos. Requiere sesion de ADMIN.
 * El resto del sistema envia correos llamando directamente a `sendEmail` (sin pasar por HTTP).
 */
export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    if (isRateLimited(session.userId)) {
      return NextResponse.json({ message: "Demasiadas solicitudes", error: "Espera un minuto." }, { status: 429 });
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos invalidos", error: parsed.error.issues[0]?.message ?? "Datos invalidos." },
        { status: 400 }
      );
    }

    const info = await deliverEmail(parsed.data);
    return NextResponse.json({ ok: true, message: "Correo enviado exitosamente", messageId: info.messageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar el correo.";
    // Sin sesion o sin rol: 401/403 en vez de 500.
    if (message === "No autorizado." || message === "Clinica no seleccionada." || message === "Debes cambiar tu contrasena.") {
      return NextResponse.json({ message: "No autorizado", error: message }, { status: 401 });
    }
    if (message === "Acceso denegado.") {
      return NextResponse.json({ message: "Acceso denegado", error: message }, { status: 403 });
    }
    console.error("[EMAIL] Error al enviar correo:", message);
    return NextResponse.json({ message: "Error al enviar correo", error: message }, { status: 500 });
  }
}
