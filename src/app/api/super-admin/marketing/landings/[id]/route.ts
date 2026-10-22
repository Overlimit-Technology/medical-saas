import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { borrarLanding, statsLanding } from "@/server/marketing/datos";
import { errorRespuesta, rangoDe, requireSuperAdmin } from "@/server/marketing/http";

export const dynamic = "force-dynamic";

// Embudo de la landing: visitas, reproducciones del video por avance y clics en el botón
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const landing = await prisma.marketingLanding.findUnique({ where: { id: params.id }, select: { slug: true } });
    if (!landing) throw new Error("Landing no encontrada.");
    const { desde, hasta } = rangoDe(new URL(req.url));
    return NextResponse.json({ ok: true, data: await statsLanding(`/l/${landing.slug}`, desde, hasta) });
  } catch (error) {
    return errorRespuesta(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    await borrarLanding(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorRespuesta(error);
  }
}
