import { NextResponse } from "next/server";
import { requireClinicSession } from "@/server/auth/requireSession";
import { LeadsCrmService } from "@/server/leads/LeadsCrmService";

async function getUserName(userId: string) {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return user?.name ?? undefined;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    const body = await req.json();
    const userName = await getUserName(session.userId);
    await LeadsCrmService.updateLead(session.clinicId, params.id, body, userName);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al actualizar lead.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    await LeadsCrmService.deleteLead(session.clinicId, params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al eliminar lead.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
