import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { MetaChatService } from "@/server/chat-meta/MetaChatService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const data = await MetaChatService.listConversations(session.clinicId, session.userId);
    return NextResponse.json({ ok: true, items: data.items, summary: data.summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar las conversaciones Meta.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
