import { NextRequest, NextResponse } from "next/server";
import { MetaChatService } from "@/server/chat-meta/MetaChatService";

type ParsedInstagramMessage = {
  text: string;
  externalUserId: string;
  externalMessageId: string | null;
  displayName: string;
  occurredAt?: Date;
};

function getVerifyToken() {
  return process.env.META_WEBHOOK_VERIFY_TOKEN?.trim() ?? "";
}

function getDefaultClinicId() {
  return process.env.META_DEFAULT_CLINIC_ID?.trim() ?? "";
}

function parseFromMessagingArray(payload: Record<string, unknown>): ParsedInstagramMessage | null {
  const entries = Array.isArray(payload.entry)
    ? (payload.entry as Array<Record<string, unknown>>)
    : [];

  for (const entry of entries) {
    const messaging = Array.isArray(entry.messaging)
      ? (entry.messaging as Array<Record<string, unknown>>)
      : [];

    for (const event of messaging) {
      const message =
        event.message && typeof event.message === "object"
          ? (event.message as Record<string, unknown>)
          : null;
      const sender =
        event.sender && typeof event.sender === "object"
          ? (event.sender as Record<string, unknown>)
          : null;

      const text =
        typeof message?.text === "string" && message.text.trim() ? message.text.trim() : null;
      const senderId =
        typeof sender?.id === "string" && sender.id.trim() ? sender.id.trim() : null;

      if (text && senderId) {
        return {
          text,
          externalUserId: senderId,
          externalMessageId:
            typeof message?.mid === "string" && message.mid.trim() ? message.mid.trim() : null,
          displayName: "Contacto Instagram",
          occurredAt:
            typeof event.timestamp === "number" ? new Date(Number(event.timestamp)) : undefined,
        };
      }
    }
  }

  return null;
}

function parseFromChangesArray(payload: Record<string, unknown>): ParsedInstagramMessage | null {
  const entries = Array.isArray(payload.entry)
    ? (payload.entry as Array<Record<string, unknown>>)
    : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry.changes)
      ? (entry.changes as Array<Record<string, unknown>>)
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

      const contact = contacts[0];
      const message = messages.find((item) => item.type === "text");
      const textBody =
        message?.text && typeof message.text === "object"
          ? ((message.text as { body?: unknown }).body as string | undefined)
          : undefined;

      if (message && textBody?.trim()) {
        return {
          text: textBody.trim(),
          externalUserId:
            typeof message.from === "string" && message.from.trim()
              ? message.from.trim()
              : "instagram-contact",
          externalMessageId:
            typeof message.id === "string" && message.id.trim() ? message.id.trim() : null,
          displayName:
            typeof contact?.profile === "object" &&
            contact.profile &&
            typeof (contact.profile as { name?: unknown }).name === "string"
              ? ((contact.profile as { name: string }).name || "Contacto Instagram").trim()
              : "Contacto Instagram",
        };
      }
    }
  }

  return null;
}

function extractInstagramMessage(payload: Record<string, unknown>): ParsedInstagramMessage | null {
  return parseFromMessagingArray(payload) ?? parseFromChangesArray(payload);
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
    const parsed = extractInstagramMessage(payload);

    if (!parsed) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    await MetaChatService.ingestInboundMessage({
      clinicId,
      channel: "INSTAGRAM",
      externalUserId: parsed.externalUserId,
      displayName: parsed.displayName,
      username: parsed.displayName,
      text: parsed.text,
      occurredAt: parsed.occurredAt,
      externalMessageId: parsed.externalMessageId,
      rawPayload: payload,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar Instagram.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
