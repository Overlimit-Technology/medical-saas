import { NextRequest, NextResponse } from "next/server";
import { MetaChatService } from "@/server/chat-meta/MetaChatService";

function getVerifyToken() {
  return process.env.META_WEBHOOK_VERIFY_TOKEN?.trim() ?? "";
}

function getDefaultClinicId() {
  return process.env.META_DEFAULT_CLINIC_ID?.trim() ?? "";
}

function extractTextMessage(payload: Record<string, unknown>) {
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray((entry as { changes?: unknown[] }).changes)
      ? ((entry as { changes?: unknown[] }).changes as Array<Record<string, unknown>>)
      : [];

    for (const change of changes) {
      const value =
        change.value && typeof change.value === "object"
          ? (change.value as Record<string, unknown>)
          : null;
      const messages = Array.isArray(value?.messages)
        ? (value.messages as Array<Record<string, unknown>>)
        : [];
      const contacts = Array.isArray(value?.contacts)
        ? (value.contacts as Array<Record<string, unknown>>)
        : [];
      const metadata =
        value?.metadata && typeof value.metadata === "object"
          ? (value.metadata as Record<string, unknown>)
          : null;

      const contact = contacts[0];
      const message = messages.find((item) => item.type === "text");
      const textBody =
        message?.text && typeof message.text === "object"
          ? ((message.text as { body?: unknown }).body as string | undefined)
          : undefined;

      if (message && textBody?.trim()) {
        return {
          text: textBody.trim(),
          externalMessageId:
            typeof message.id === "string" && message.id.trim() ? message.id.trim() : null,
          externalUserId:
            typeof message.from === "string" && message.from.trim()
              ? message.from.trim()
              : "unknown-contact",
          displayName:
            typeof contact?.profile === "object" &&
            contact.profile &&
            typeof (contact.profile as { name?: unknown }).name === "string"
              ? ((contact.profile as { name: string }).name || "Contacto WhatsApp").trim()
              : "Contacto WhatsApp",
          phone:
            typeof message.from === "string" && message.from.trim() ? message.from.trim() : null,
          metaAccountId:
            typeof metadata?.display_phone_number === "string"
              ? metadata.display_phone_number
              : null,
          metaThreadId:
            typeof metadata?.phone_number_id === "string" ? metadata.phone_number_id : null,
        };
      }
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === getVerifyToken()) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ ok: false, error: "Webhook no verificado." }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const clinicId = getDefaultClinicId();
    if (!clinicId) {
      return NextResponse.json(
        { ok: false, error: "META_DEFAULT_CLINIC_ID no configurado." },
        { status: 500 }
      );
    }

    const payload = (await req.json()) as Record<string, unknown>;
    const parsed = extractTextMessage(payload);

    if (!parsed) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    await MetaChatService.ingestInboundMessage({
      clinicId,
      channel: "WHATSAPP",
      externalUserId: parsed.externalUserId,
      displayName: parsed.displayName,
      phone: parsed.phone,
      text: parsed.text,
      externalMessageId: parsed.externalMessageId,
      metaAccountId: parsed.metaAccountId,
      metaThreadId: parsed.metaThreadId,
      rawPayload: payload,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar el webhook.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
