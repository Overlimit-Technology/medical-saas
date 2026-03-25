import { NextRequest, NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { ChatService } from "@/server/chat/ChatService";
import { uploadChatFile } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

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

    const formData = await req.formData();
    const recipientId = (formData.get("recipientId") as string)?.trim();
    const text = (formData.get("text") as string)?.trim() ?? "";
    const file = formData.get("file") as File | null;

    if (!recipientId) {
      return NextResponse.json({ ok: false, error: "Destinatario requerido." }, { status: 400 });
    }

    if (!text && !file) {
      return NextResponse.json(
        { ok: false, error: "Debes enviar un mensaje o un archivo." },
        { status: 400 }
      );
    }

    let attachment: {
      url: string;
      fileName: string;
      fileType: string;
      fileSize: number;
    } | undefined;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadChatFile(buffer, file.name, file.type, file.size);
      attachment = {
        url: uploaded.url,
        fileName: uploaded.fileName,
        fileType: uploaded.fileType,
        fileSize: uploaded.fileSize,
      };
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
