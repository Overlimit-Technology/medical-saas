import { NextResponse } from "next/server";
import { BookingError } from "@/server/booking/BookingService";
import { PortalError, resolvePortalClinic } from "./PortalAuthService";

/** Respuesta de error de las rutas del portal: mensajes propios para el paciente, genericos para lo demas. */
export function portalErrorResponse(error: unknown, fallback: string) {
  if (error instanceof PortalError || error instanceof BookingError) {
    const status = /sesion|no esta disponible/i.test(error.message) ? 401 : 400;
    return NextResponse.json({ ok: false, error: error.message }, { status });
  }
  console.error("[PORTAL]", error);
  return NextResponse.json({ ok: false, error: fallback }, { status: 500 });
}

export const tooMany = () =>
  NextResponse.json({ ok: false, error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });

export function invalid(message?: string) {
  return NextResponse.json({ ok: false, error: message ?? "Datos invalidos." }, { status: 400 });
}

export async function requirePortalClinic(slug: string) {
  const clinic = await resolvePortalClinic(slug);
  if (!clinic) throw new PortalError("El portal no esta disponible.");
  return clinic;
}
