import { NextResponse } from "next/server";
import { requireClinicSession } from "@/server/auth/requireSession";
import { LeadsCrmService } from "@/server/leads/LeadsCrmService";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    const body = await req.json();
    if (!body.text?.trim()) {
      return NextResponse.json({ ok: false, error: "El texto es obligatorio." }, { status: 400 });
    }
    const msg = await LeadsCrmService.addMessage(session.clinicId, params.id, {
      text: body.text.trim(),
      direction: body.direction || "outbound",
      channel: body.channel || "other",
    });
    return NextResponse.json({
      ok: true,
      item: {
        id: msg.id,
        text: msg.text,
        direction: msg.direction,
        channel: msg.channel,
        createdAt: msg.createdAt.toISOString(),
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al enviar mensaje.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
