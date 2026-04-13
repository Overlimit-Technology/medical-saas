import { NextResponse } from "next/server";
import { requireClinicSession } from "@/server/auth/requireSession";
import { LeadsCrmService } from "@/server/leads/LeadsCrmService";

async function getUserName(userId: string) {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return user?.name ?? undefined;
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    const userName = await getUserName(session.userId);
    await LeadsCrmService.archiveLead(session.clinicId, params.id, userName);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al archivar lead.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    const userName = await getUserName(session.userId);
    await LeadsCrmService.unarchiveLead(session.clinicId, params.id, userName);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al desarchivar lead.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
