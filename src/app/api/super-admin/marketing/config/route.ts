import { NextResponse } from "next/server";
import { guardarConfig, leerConfig } from "@/server/marketing/datos";
import { ConfigEntrada, primerError } from "@/server/marketing/mapeo";
import { errorRespuesta, requireSuperAdmin } from "@/server/marketing/http";

export const dynamic = "force-dynamic";

// Pixeles de Meta y Google, y si se pide permiso antes de medir
export async function GET() {
  try {
    await requireSuperAdmin();
    return NextResponse.json({ ok: true, data: await leerConfig() });
  } catch (error) {
    return errorRespuesta(error);
  }
}

export async function PUT(req: Request) {
  try {
    await requireSuperAdmin();
    const r = ConfigEntrada.safeParse(await req.json());
    if (!r.success) return NextResponse.json({ ok: false, error: primerError(r.error) }, { status: 400 });
    return NextResponse.json({ ok: true, data: await guardarConfig(r.data) });
  } catch (error) {
    return errorRespuesta(error);
  }
}
