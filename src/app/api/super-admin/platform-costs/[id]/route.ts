import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/server/audit/AuditService";
import { jsonError, requireSuperAdmin } from "@/server/super-admin/guard";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes invalido (use AAAA-MM).").optional(),
    category: z.string().trim().min(1).max(60).optional(),
    description: z.string().trim().max(200).nullable().optional(),
    amount: z.number().min(0).max(1_000_000_000).optional(),
  })
  .strict();

const select = { id: true, month: true, category: true, description: true, amount: true } as const;
const serialize = (c: { id: string; month: string; category: string; description: string | null; amount: unknown }) => ({
  ...c,
  amount: Number(c.amount),
});

export async function PATCH(req: Request, context: { params: { id: string } }) {
  const g = await requireSuperAdmin();
  if (!g.ok) return g.response;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) return jsonError("Datos invalidos.", 400);

  const before = await prisma.platformCost.findUnique({ where: { id: context.params.id }, select });
  if (!before) return jsonError("Costo no encontrado.", 404);

  const item = await prisma.platformCost.update({ where: { id: before.id }, data: parsed.data, select });
  await AuditService.log(
    "SUPERADMIN_COST_UPDATE",
    g.actor.email,
    JSON.stringify({ before: serialize(before), after: serialize(item) })
  );
  return NextResponse.json({ ok: true, item: serialize(item) });
}

// Borra solo el registro de un costo de plataforma (no afecta a ninguna sede).
export async function DELETE(_req: Request, context: { params: { id: string } }) {
  const g = await requireSuperAdmin();
  if (!g.ok) return g.response;

  const before = await prisma.platformCost.findUnique({ where: { id: context.params.id }, select });
  if (!before) return jsonError("Costo no encontrado.", 404);

  await prisma.platformCost.delete({ where: { id: before.id } });
  await AuditService.log("SUPERADMIN_COST_DELETE", g.actor.email, JSON.stringify(serialize(before)));
  return NextResponse.json({ ok: true });
}
