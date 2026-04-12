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
    const note = await LeadsCrmService.addNote(session.clinicId, params.id, body.text.trim());
    return NextResponse.json({ ok: true, item: { id: note.id, text: note.text, createdAt: note.createdAt.toISOString() } });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al agregar nota.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
