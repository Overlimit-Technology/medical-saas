import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { MetaChatService } from "@/server/chat-meta/MetaChatService";

export const dynamic = "force-dynamic";

const sendMetaMessageSchema = z.object({
  conversationId: z.string().min(1),
  text: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], "CHAT_META");

    const conversationId = req.nextUrl.searchParams.get("conversationId")?.trim() ?? "";
    const data = await MetaChatService.listMessages(
      session.clinicId,
      session.userId,
      conversationId
    );

    return NextResponse.json({
      ok: true,
      currentUserId: session.userId,
      conversation: data.conversation,
      items: data.items,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar los mensajes Meta.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], "CHAT_META");

    const body = await req.json();
    const parsed = sendMetaMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }

    const item = await MetaChatService.sendMessage({
      clinicId: session.clinicId,
      userId: session.userId,
      conversationId: parsed.data.conversationId,
      text: parsed.data.text,
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar el mensaje Meta.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
