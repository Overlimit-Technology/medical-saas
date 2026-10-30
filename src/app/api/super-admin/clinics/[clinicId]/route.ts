import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/server/audit/AuditService";
import { jsonError, requireSuperAdmin } from "@/server/super-admin/guard";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    city: z.string().trim().min(1).max(80).optional(),
    planName: z.string().trim().max(60).nullable().optional(),
    monthlyPrice: z.number().int().min(0).max(100_000_000).nullable().optional(),
  })
  .strict();

const detailSelect = {
  id: true,
  name: true,
  city: true,
  isActive: true,
  billingStatus: true,
  planName: true,
  monthlyPrice: true,
  trialEndsAt: true,
  subscriptionStartedAt: true,
  canceledAt: true,
  createdAt: true,
} as const;

type DetailRow = {
  id: string;
  name: string;
  city: string;
  isActive: boolean;
  billingStatus: string;
  planName: string | null;
  monthlyPrice: { toString(): string } | null;
  trialEndsAt: Date | null;
  subscriptionStartedAt: Date | null;
  canceledAt: Date | null;
  createdAt: Date;
};

function serialize(c: DetailRow) {
  return {
    ...c,
    monthlyPrice: c.monthlyPrice === null ? null : Number(c.monthlyPrice),
    trialEndsAt: c.trialEndsAt?.toISOString() ?? null,
    subscriptionStartedAt: c.subscriptionStartedAt?.toISOString() ?? null,
    canceledAt: c.canceledAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

// Detalle de una sede para el panel lateral: datos comerciales, usuarios (sin datos sensibles) y ultimos eventos.
export async function GET(_req: Request, context: { params: { clinicId: string } }) {
  const g = await requireSuperAdmin();
  if (!g.ok) return g.response;

  const clinic = await prisma.clinic.findUnique({
    where: { id: context.params.clinicId },
    select: {
      ...detailSelect,
      memberships: {
        where: { status: "ACTIVE" },
        select: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              status: true,
              isSuperAdmin: true,
              lastLoginAt: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });
  if (!clinic) return jsonError("Sede no encontrada.", 404);

  const { memberships, ...rest } = clinic;
  const history = await prisma.auditLog.findMany({
    where: { event: { startsWith: "SUPERADMIN_CLINIC" }, detail: { contains: clinic.id } },
    orderBy: { occurredAt: "desc" },
    take: 10,
    select: { id: true, occurredAt: true, event: true, author: true },
  });

  return NextResponse.json({
    ok: true,
    clinic: serialize(rest),
    users: memberships
      .filter((m) => !m.user.isSuperAdmin)
      .map((m) => ({
        id: m.user.id,
        email: m.user.email,
        role: m.user.role,
        status: m.user.status,
        name: [m.user.profile?.firstName, m.user.profile?.lastName].filter(Boolean).join(" "),
        lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
      })),
    history: history.map((h) => ({ ...h, occurredAt: h.occurredAt.toISOString() })),
  });
}

// Edita nombre, ciudad, plan y precio mensual. El estado comercial y el acceso cambian con /action.
export async function PATCH(req: Request, context: { params: { clinicId: string } }) {
  const g = await requireSuperAdmin();
  if (!g.ok) return g.response;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) return jsonError("Datos invalidos.", 400);

  const before = await prisma.clinic.findUnique({ where: { id: context.params.clinicId }, select: detailSelect });
  if (!before) return jsonError("Sede no encontrada.", 404);

  const d = parsed.data;
  const updated = await prisma.clinic.update({
    where: { id: before.id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.city !== undefined ? { city: d.city } : {}),
      ...(d.planName !== undefined ? { planName: d.planName || null } : {}),
      ...(d.monthlyPrice !== undefined ? { monthlyPrice: d.monthlyPrice } : {}),
    },
    select: detailSelect,
  });

  const snap = (c: DetailRow) => ({
    name: c.name,
    city: c.city,
    planName: c.planName,
    monthlyPrice: c.monthlyPrice === null ? null : Number(c.monthlyPrice),
  });
  await AuditService.log(
    "SUPERADMIN_CLINIC_UPDATE",
    g.actor.email,
    JSON.stringify({ clinicId: before.id, before: snap(before), after: snap(updated) })
  );

  return NextResponse.json({ ok: true, clinic: serialize(updated) });
}
