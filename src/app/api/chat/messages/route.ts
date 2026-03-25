import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { ChatService } from "@/server/chat/ChatService";

export const dynamic = "force-dynamic";

const sendMessageSchema = z.object({
  recipientId: z.string().min(1),
  text: z.string().default(""),
  attachment: z
    .object({
      url: z.string().url(),
      fileName: z.string().min(1),
      fileType: z.string().min(1),
      fileSize: z.number().int().positive(),
    })
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "DOCTOR", "SECRETARY"]);

    const contactId = req.nextUrl.searchParams.get("contactId")?.trim() ?? "";
    const data = await ChatService.listMessages(session.clinicId, session.userId, contactId);

    return NextResponse.json({
      ok: true,
      currentUserId: session.userId,
      conversationId: data.conversationId,
      items: data.items,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar los mensajes.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "DOCTOR", "SECRETARY"]);

    const body = await req.json();
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }

    const { recipientId, text, attachment } = parsed.data;

    if (!text.trim() && !attachment) {
      return NextResponse.json(
        { ok: false, error: "Debes enviar un mensaje o un archivo." },
        { status: 400 }
      );
    }

    const item = await ChatService.sendMessage({
      clinicId: session.clinicId,
      senderId: session.userId,
      recipientId,
      text,
      attachment,
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo guardar el mensaje.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
