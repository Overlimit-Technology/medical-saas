import { NextResponse } from "next/server";
import { requireAuthSession } from "@/server/auth/requireSession";
import { getBillingMetrics } from "@/server/super-admin/billingMetrics";

export const dynamic = "force-dynamic";

export async function GET() {
  let session;
  try {
    session = await requireAuthSession();
  } catch {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  if (session.isSuperAdmin !== true) {
    return NextResponse.json({ ok: false, error: "Acceso denegado." }, { status: 403 });
  }

  try {
    const data = await getBillingMetrics();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("billing-metrics", error);
    return NextResponse.json({ ok: false, error: "No se pudieron calcular las metricas." }, { status: 500 });
  }
}
