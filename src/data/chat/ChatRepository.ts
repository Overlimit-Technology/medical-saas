import type {
  ChatAttachment,
  ChatContactsResult,
  ChatMessage,
  ChatMessagesResult,
  Contact,
} from "@/domain/chat/entities/Chat";
import type { ChatRepository } from "@/domain/chat/repositories/ChatRepository";

type ContactsPayload = {
  ok: boolean;
  clinic?: { id: string; name: string; city: string } | null;
  items?: Contact[];
  error?: string;
};

type MessagesPayload = {
  ok: boolean;
  currentUserId?: string;
  conversationId?: string | null;
  items?: ChatMessage[];
  item?: ChatMessage;
  error?: string;
};

type UploadSignaturePayload = {
  ok: boolean;
  signature: string;
  timestamp: number;
  folder: string;
  apiKey: string;
  cloudName: string;
  error?: string;
};

export class ChatRepositoryHttp implements ChatRepository {
  async getContacts(): Promise<ChatContactsResult> {
    const res = await fetch("/api/chat/contacts", {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as ContactsPayload | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudieron cargar los contactos.");
    }

    return {
      clinicLabel: data.clinic ? `${data.clinic.name} - ${data.clinic.city}` : "Sede actual",
      contacts: data.items ?? [],
    };
  }

  async getMessages(contactId: string): Promise<ChatMessagesResult> {
    const res = await fetch(`/api/chat/messages?contactId=${contactId}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as MessagesPayload | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudieron cargar los mensajes.");
    }

    return {
      currentUserId: data.currentUserId ?? null,
      messages: data.items ?? [],
    };
  }

  async uploadAttachment(file: File): Promise<ChatAttachment> {
    const sigRes = await fetch("/api/chat/upload-signature", {
      method: "POST",
      credentials: "include",
    });
    const sigData = (await sigRes.json().catch(() => null)) as UploadSignaturePayload | null;

    if (!sigRes.ok || !sigData?.ok) {
      throw new Error(sigData?.error ?? "No se pudo obtener firma de subida.");
    }

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("timestamp", String(sigData.timestamp));
    uploadForm.append("signature", sigData.signature);
    uploadForm.append("folder", sigData.folder);
    uploadForm.append("api_key", sigData.apiKey);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${sigData.cloudName}/auto/upload`,
      { method: "POST", body: uploadForm }
    );
    const uploadData = await uploadRes.json().catch(() => null);

    if (!uploadRes.ok || !uploadData?.secure_url) {
      throw new Error("Error al subir el archivo.");
    }

    return {
      url: uploadData.secure_url as string,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    };
  }

  async sendMessage(input: {
    recipientId: string;
    text: string;
    attachment?: ChatAttachment;
  }): Promise<ChatMessage> {
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as MessagesPayload | null;

    if (!res.ok || !data?.ok || !data.item) {
      throw new Error(data?.error ?? "No se pudo enviar el mensaje.");
    }

    return data.item;
  }
}
