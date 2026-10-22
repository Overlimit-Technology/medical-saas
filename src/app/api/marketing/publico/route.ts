// Público (zensya.cl): pixeles configurados, si se pide permiso antes de medir y los tests A/B activos.
import { experimentosActivos, leerConfig } from "@/server/marketing/datos";
import { jsonPublico, preflight } from "@/server/marketing/http";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

export async function GET(req: Request) {
  try {
    const [config, experimentos] = await Promise.all([leerConfig(), experimentosActivos()]);
    const publica = { ...config, actualizado: undefined };
    // Caché corta en el borde de Vercel: los cambios del dashboard se ven en menos de un minuto
    return jsonPublico(req, { ok: true, config: publica, experimentos }, { cache: "public, s-maxage=30, stale-while-revalidate=120" });
  } catch {
    return jsonPublico(req, { ok: false, config: null, experimentos: [] }, { status: 500 });
  }
}
