import { NextResponse } from "next/server";
import { guardarLanding, listarLandings } from "@/server/marketing/datos";
import { LandingEntrada, primerError } from "@/server/marketing/mapeo";
import { errorRespuesta, requireSuperAdmin } from "@/server/marketing/http";

export const dynamic = "force-dynamic";

// Landings de campaña / VSL: listar y crear/actualizar (si viene id)
export async function GET() {
  try {
    await requireSuperAdmin();
    return NextResponse.json({ ok: true, data: await listarLandings() });
  } catch (error) {
    return errorRespuesta(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
    const r = LandingEntrada.safeParse(await req.json());
    if (!r.success) return NextResponse.json({ ok: false, error: primerError(r.error) }, { status: 400 });
    if (r.data.cta_accion === "link" && !r.data.cta_link) return NextResponse.json({ ok: false, error: "Escribe a dónde lleva el botón." }, { status: 400 });
    return NextResponse.json({ ok: true, data: await guardarLanding(r.data) });
  } catch (error) {
    return errorRespuesta(error);
  }
}
