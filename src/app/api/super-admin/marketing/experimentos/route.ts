import { NextResponse } from "next/server";
import { guardarExperimento, listarExperimentos } from "@/server/marketing/datos";
import { ExperimentoEntrada, primerError } from "@/server/marketing/mapeo";
import { errorRespuesta, requireSuperAdmin } from "@/server/marketing/http";

export const dynamic = "force-dynamic";

// Tests A/B: listar y crear/actualizar (si viene id)
export async function GET() {
  try {
    await requireSuperAdmin();
    return NextResponse.json({ ok: true, data: await listarExperimentos() });
  } catch (error) {
    return errorRespuesta(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
    const r = ExperimentoEntrada.safeParse(await req.json());
    if (!r.success) return NextResponse.json({ ok: false, error: primerError(r.error) }, { status: 400 });
    return NextResponse.json({ ok: true, data: await guardarExperimento(r.data) });
  } catch (error) {
    return errorRespuesta(error);
  }
}
