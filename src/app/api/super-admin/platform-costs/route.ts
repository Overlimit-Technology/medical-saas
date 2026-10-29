import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/server/audit/AuditService";
import { jsonError, requireSuperAdmin } from "@/server/super-admin/guard";

export const dynamic = "force-dynamic";

const costSchema = z
  .object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes invalido (use AAAA-MM)."),
    category: z.string().trim().min(1).max(60),
    description: z.string().trim().max(200).nullable().optional(),
    amount: z.number().min(0).max(1_000_000_000),
  })
  .strict();

function serialize(c: { id: string; month: string; category: string; description: string | null; amount: unknown }) {
  return { id: c.id, month: c.month, category: c.category, description: c.description, amount: Number(c.amount) };
}

// Costos de plataforma de los ultimos 13 meses (los que usa el margen del dashboard).
export async function GET() {
  const g = await requireSuperAdmin();
  if (!g.ok) return g.response;

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 12, 1);
  const fromKey = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;
  const items = await prisma.platformCost.findMany({
    where: { month: { gte: fromKey } },
    orderBy: [{ month: "desc" }, { category: "asc" }],
    select: { id: true, month: true, category: true, description: true, amount: true },
  });
  return NextResponse.json({ ok: true, items: items.map(serialize) });
}

export async function POST(req: Request) {
  const g = await requireSuperAdmin();
  if (!g.ok) return g.response;

  const parsed = costSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Datos invalidos.", 400);

  const item = await prisma.platformCost.create({
    data: { ...parsed.data, description: parsed.data.description ?? null },
    select: { id: true, month: true, category: true, description: true, amount: true },
  });
  await AuditService.log("SUPERADMIN_COST_CREATE", g.actor.email, JSON.stringify(serialize(item)));
  return NextResponse.json({ ok: true, item: serialize(item) }, { status: 201 });
}
