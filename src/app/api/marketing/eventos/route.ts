// Público (zensya.cl): recibe lotes de eventos de medición (visitas, conversiones, tests A/B, video).
// Solo inserta: nadie puede leer eventos desde aquí. Se valida cada evento y se descartan los inválidos.
import { z } from "zod";
import { registrarEventos } from "@/server/marketing/datos";
import { EventoEntrada } from "@/server/marketing/mapeo";
import { corsHeaders, jsonPublico, preflight } from "@/server/marketing/http";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

const MAX_LOTE = 50;

export async function POST(req: Request) {
  // Solo se aceptan envíos desde los orígenes permitidos (zensya.cl y desarrollo local)
  if (!corsHeaders(req)["Access-Control-Allow-Origin"]) {
    return jsonPublico(req, { ok: false, error: "Origen no permitido." }, { status: 403 });
  }
  try {
    const texto = await req.text();
    if (texto.length > 64_000) return jsonPublico(req, { ok: false, error: "Lote demasiado grande." }, { status: 413 });
    const cuerpo = z.array(z.unknown()).max(MAX_LOTE).parse(JSON.parse(texto));
    const validos = cuerpo.map((e) => EventoEntrada.safeParse(e)).filter((r) => r.success).map((r) => r.data);
    const guardados = await registrarEventos(validos);
    return jsonPublico(req, { ok: true, guardados, descartados: cuerpo.length - validos.length });
  } catch {
    return jsonPublico(req, { ok: false, error: "No se pudieron registrar los eventos." }, { status: 400 });
  }
}
