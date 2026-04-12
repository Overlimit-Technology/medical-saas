import { NextResponse } from "next/server";
import { requireClinicSession } from "@/server/auth/requireSession";
import { LeadsCrmService } from "@/server/leads/LeadsCrmService";

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ ok: false, error: "El nombre es obligatorio." }, { status: 400 });
    }

    // Resolve user name for activity log
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true },
    });

    const lead = await LeadsCrmService.createLead(session.clinicId, body, user?.name ?? undefined);
    return NextResponse.json({ ok: true, item: lead });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al crear lead.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
