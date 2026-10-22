import { NextResponse } from "next/server";
import { borrarExperimento, statsExperimento } from "@/server/marketing/datos";
import { errorRespuesta, requireSuperAdmin } from "@/server/marketing/http";

export const dynamic = "force-dynamic";

// Resultados del test por variante (visitantes expuestos y cuántos convirtieron)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    return NextResponse.json({ ok: true, data: await statsExperimento(params.id) });
  } catch (error) {
    return errorRespuesta(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    await borrarExperimento(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorRespuesta(error);
  }
}
