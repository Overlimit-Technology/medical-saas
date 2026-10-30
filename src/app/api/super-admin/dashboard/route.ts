import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSuperAdmin } from "@/server/super-admin/guard";
import { getDashboardData } from "@/server/super-admin/dashboardData";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  months: z.enum(["3", "6", "12"]).default("6"),
  plan: z.string().trim().min(1).max(80).optional(),
  status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED", "SUSPENDED"]).optional(),
  city: z.string().trim().min(1).max(80).optional(),
  q: z.string().trim().min(1).max(80).optional(),
});

export async function GET(req: Request) {
  const g = await requireSuperAdmin();
  if (!g.ok) return g.response;

  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return jsonError("Filtros invalidos.", 400);

  try {
    const { months, ...rest } = parsed.data;
    const data = await getDashboardData({ months: Number(months) as 3 | 6 | 12, ...rest });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("super-admin/dashboard", error);
    return jsonError("No se pudo calcular el dashboard.", 500);
  }
}
