import { NextResponse } from "next/server";
import { chileDateString } from "@/lib/chileTime";
import { MAX_WIDGETS } from "@/lib/dashboard/catalog";
import { PERIODS, resolvePeriod, type PeriodKey } from "@/lib/dashboard/period";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { computeMetrics } from "@/server/dashboard/DashboardMetrics";
import { mapErrorToHttpStatus } from "@/server/fhir/r4/response";

export const dynamic = "force-dynamic";

/**
 * Datos de los widgets del panel personalizable.
 * GET /api/dashboard/widgets?period=month&offset=0&metrics=appointments,revenue
 * Devuelve el periodo resuelto (fechas, nombre y tramos) y el resultado de cada metrica.
 */
export async function GET(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const url = new URL(req.url);
    const periodParam = url.searchParams.get("period") ?? "month";
    if (!PERIODS.includes(periodParam as PeriodKey)) {
      return NextResponse.json({ ok: false, error: "Periodo no válido." }, { status: 400 });
    }
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const ids = Array.from(
      new Set((url.searchParams.get("metrics") ?? "").split(",").map((s) => s.trim()).filter(Boolean))
    ).slice(0, MAX_WIDGETS);

    const range = resolvePeriod(periodParam as PeriodKey, offset, chileDateString(new Date()));
    const metrics = await computeMetrics(session.clinicId, range, ids);

    return NextResponse.json({
      ok: true,
      data: {
        period: { key: range.key, offset: range.offset, label: range.label, start: range.start, end: range.end },
        metrics,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar los datos del panel.";
    const status = mapErrorToHttpStatus(message);
    if (status >= 500) console.error("Error fetching dashboard widgets:", error);
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
