// Utilidades HTTP del marketing: CORS para el sitio público (zensya.cl) y control de acceso del super-admin.
import { NextResponse } from "next/server";
import { requireAuthSession } from "@/server/auth/requireSession";

// Orígenes que pueden enviar visitas y leer la configuración pública. Se pueden sumar más con
// MARKETING_ALLOWED_ORIGINS="https://otro.cl,https://preview.vercel.app" (separados por coma).
const ORIGENES_BASE = ["https://zensya.cl", "https://www.zensya.cl", "http://localhost:5173", "http://localhost:4173"];

function origenesPermitidos() {
  const extra = (process.env.MARKETING_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return new Set([...ORIGENES_BASE, ...extra]);
}

export function corsHeaders(req: Request): Record<string, string> {
  const origen = req.headers.get("origin") ?? "";
  if (!origenesPermitidos().has(origen)) return {};
  return {
    "Access-Control-Allow-Origin": origen,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export const preflight = (req: Request) => new NextResponse(null, { status: 204, headers: corsHeaders(req) });

export function jsonPublico(req: Request, data: unknown, init: { status?: number; cache?: string } = {}) {
  return NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { ...corsHeaders(req), "Cache-Control": init.cache ?? "no-store" },
  });
}

/** Lanza si la sesión no es de super-admin. */
export async function requireSuperAdmin() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) throw new AccesoDenegado();
  return session;
}

export class AccesoDenegado extends Error {
  constructor() {
    super("Acceso denegado.");
  }
}

export function errorRespuesta(error: unknown, porDefecto = "No se pudo completar la operación.") {
  if (error instanceof AccesoDenegado) return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
  const message = error instanceof Error ? error.message : porDefecto;
  const status = message === "No autorizado." ? 401 : 400;
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Rango de fechas desde la query (?desde=ISO&hasta=ISO); por defecto los últimos 30 días. */
export function rangoDe(url: URL) {
  const hasta = new Date(url.searchParams.get("hasta") ?? Date.now());
  const desde = new Date(url.searchParams.get("desde") ?? hasta.getTime() - 30 * 86400000);
  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) throw new Error("Rango de fechas inválido.");
  return { desde, hasta };
}
