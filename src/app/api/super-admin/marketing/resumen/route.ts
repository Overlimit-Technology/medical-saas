import { NextResponse } from "next/server";
import { resumen } from "@/server/marketing/datos";
import { errorRespuesta, rangoDe, requireSuperAdmin } from "@/server/marketing/http";

export const dynamic = "force-dynamic";

// Resumen del sitio: visitas, visitantes, conversiones, por día, páginas, fuentes, campañas y dispositivos
export async function GET(req: Request) {
  try {
    await requireSuperAdmin();
    const { desde, hasta } = rangoDe(new URL(req.url));
    return NextResponse.json({ ok: true, data: await resumen(desde, hasta) });
  } catch (error) {
    return errorRespuesta(error, "No se pudo cargar el resumen.");
  }
}
