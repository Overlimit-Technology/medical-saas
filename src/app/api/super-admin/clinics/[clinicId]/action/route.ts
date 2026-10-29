import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/server/audit/AuditService";
import { clinicActionSchema, planClinicAction } from "@/server/super-admin/clinicActions";
import { jsonError, requireSuperAdmin } from "@/server/super-admin/guard";

export const dynamic = "force-dynamic";

// Acciones reversibles sobre una sede: suspender, reactivar, extender/terminar prueba, marcar morosa/cancelada.
// No existe accion para borrar una sede.
export async function POST(req: Request, context: { params: { clinicId: string } }) {
  const g = await requireSuperAdmin();
  if (!g.ok) return g.response;

  const body = await req.json().catch(() => null);
  const parsed = clinicActionSchema.safeParse(body);
  if (!parsed.success) return jsonError("Accion invalida.", 400);

  const clinic = await prisma.clinic.findUnique({
    where: { id: context.params.clinicId },
    select: {
      id: true,
      name: true,
      isActive: true,
      billingStatus: true,
      monthlyPrice: true,
      trialEndsAt: true,
      subscriptionStartedAt: true,
    },
  });
  if (!clinic) return jsonError("Sede no encontrada.", 404);

  const plan = planClinicAction(
    { ...clinic, monthlyPrice: clinic.monthlyPrice === null ? null : Number(clinic.monthlyPrice) },
    parsed.data,
    new Date()
  );
  if (!plan.ok) return jsonError(plan.error, 409);

  const updated = await prisma.clinic.update({
    where: { id: clinic.id },
    data: plan.data,
    select: { id: true, isActive: true, billingStatus: true, trialEndsAt: true, canceledAt: true, subscriptionStartedAt: true },
  });

  await AuditService.log(
    plan.event,
    g.actor.email,
    JSON.stringify({
      clinicId: clinic.id,
      clinicName: clinic.name,
      action: parsed.data,
      before: { isActive: clinic.isActive, billingStatus: clinic.billingStatus },
      after: { isActive: updated.isActive, billingStatus: updated.billingStatus },
    })
  );

  return NextResponse.json({
    ok: true,
    clinic: {
      ...updated,
      trialEndsAt: updated.trialEndsAt?.toISOString() ?? null,
      canceledAt: updated.canceledAt?.toISOString() ?? null,
      subscriptionStartedAt: updated.subscriptionStartedAt?.toISOString() ?? null,
    },
  });
}
