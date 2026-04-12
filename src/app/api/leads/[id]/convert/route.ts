import { NextResponse } from "next/server";
import { requireClinicSession } from "@/server/auth/requireSession";
import { LeadsCrmService } from "@/server/leads/LeadsCrmService";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();

    // Get lead data
    const lead = await prisma.crmLead.findFirst({
      where: { id: params.id, clinicId: session.clinicId },
      select: { name: true, phone: true, email: true },
    });
    if (!lead) {
      return NextResponse.json({ ok: false, error: "Lead no encontrado." }, { status: 404 });
    }

    // Parse name into first/last
    const parts = lead.name.trim().split(/\s+/);
    const firstName = parts[0] || "Lead";
    const lastName = parts.slice(1).join(" ") || "Convertido";

    // Create patient
    const body = await req.json().catch(() => ({}));
    const run = body.run || "";

    const patient = await prisma.patient.create({
      data: {
        clinicId: session.clinicId,
        firstName,
        lastName,
        run,
        runNormalized: run.replace(/[^0-9kK]/g, "").toLowerCase(),
        email: lead.email || null,
        phone: lead.phone || null,
        isActive: true,
      },
    });

    // Get user name for activity
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });

    // Mark lead as converted
    await LeadsCrmService.convertLead(session.clinicId, params.id, patient.id, user?.name ?? undefined);

    return NextResponse.json({ ok: true, patientId: patient.id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al convertir lead.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
