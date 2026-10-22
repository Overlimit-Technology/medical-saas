// Público (zensya.cl/l/<slug>): contenido de una landing de campaña publicada.
import { landingPublicada } from "@/server/marketing/datos";
import { jsonPublico, preflight } from "@/server/marketing/http";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const landing = await landingPublicada(params.slug);
    if (!landing) return jsonPublico(req, { ok: false, landing: null }, { status: 404 });
    return jsonPublico(req, { ok: true, landing }, { cache: "public, s-maxage=30, stale-while-revalidate=120" });
  } catch {
    return jsonPublico(req, { ok: false, landing: null }, { status: 500 });
  }
}
