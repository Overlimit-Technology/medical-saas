import { ObjectId } from "mongodb";
import { prisma } from "@/lib/prisma";
import { getMongoDb } from "@/lib/mongodb";

type ConversationDoc = {
  _id?: ObjectId;
  clinicId: string;
  participantIds: [string, string];
  participantKey: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageText: string | null;
  lastMessageAt: Date | null;
};

type MessageDoc = {
  _id?: ObjectId;
  conversationId: ObjectId;
  clinicId: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: Date;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number;
};

export type ChatMessageItem = {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number;
};

let indexPromise: Promise<void> | null = null;

function getParticipantPair(userId: string, contactId: string): [string, string] {
  return [userId, contactId].sort() as [string, string];
}

function getParticipantKey(userId: string, contactId: string) {
  return getParticipantPair(userId, contactId).join(":");
}

async function ensureIndexes() {
  if (!indexPromise) {
    indexPromise = (async () => {
      const db = await getMongoDb();
      await db
        .collection<ConversationDoc>("chat_conversations")
        .createIndex({ clinicId: 1, participantKey: 1 }, { unique: true });
      await db
        .collection<MessageDoc>("chat_messages")
        .createIndex({ conversationId: 1, createdAt: 1 });
      await db
        .collection<MessageDoc>("chat_messages")
        .createIndex({ clinicId: 1, senderId: 1, recipientId: 1, createdAt: 1 });
    })();
  }

  return indexPromise;
}

async function ensureChatParticipant(clinicId: string, userId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      status: "ACTIVE",
      clinicMemberships: {
        some: {
          clinicId,
          status: "ACTIVE",
        },
      },
    },
    select: { id: true },
  });

  if (!user) {
    throw new Error("El usuario no pertenece a la sede actual.");
  }

  return user;
}

async function getConversationDoc(clinicId: string, userId: string, contactId: string) {
  await ensureIndexes();

  const db = await getMongoDb();
  const conversations = db.collection<ConversationDoc>("chat_conversations");
  const participantIds = getParticipantPair(userId, contactId);
  const participantKey = getParticipantKey(userId, contactId);

  await conversations.updateOne(
    { clinicId, participantKey },
    {
      $setOnInsert: {
        clinicId,
        participantIds,
        participantKey,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageText: null,
        lastMessageAt: null,
      },
    },
    { upsert: true }
  );

  const conversation = await conversations.findOne({ clinicId, participantKey });
  if (!conversation) {
    throw new Error("No se pudo crear la conversacion.");
  }

  return conversation;
}

function mapMessage(doc: MessageDoc): ChatMessageItem {
  if (!doc._id) {
    throw new Error("Mensaje sin identificador en MongoDB.");
  }
  if (!doc.conversationId) {
    throw new Error("Mensaje sin conversacion asociada.");
  }

  const item: ChatMessageItem = {
    id: doc._id.toHexString(),
    conversationId: doc.conversationId.toHexString(),
    senderId: doc.senderId,
    recipientId: doc.recipientId,
    text: doc.text,
    createdAt: doc.createdAt.toISOString(),
  };

  if (doc.attachmentUrl) {
    item.attachmentUrl = doc.attachmentUrl;
    item.attachmentName = doc.attachmentName;
    item.attachmentType = doc.attachmentType;
    item.attachmentSize = doc.attachmentSize;
  }

  return item;
}

export class ChatService {
  static async listMessages(clinicId: string, userId: string, contactId: string) {
    if (!contactId || contactId === userId) {
      throw new Error("Debes seleccionar un contacto valido.");
    }

    await Promise.all([
      ensureChatParticipant(clinicId, userId),
      ensureChatParticipant(clinicId, contactId),
    ]);

    const db = await getMongoDb();
    const messages = db.collection<MessageDoc>("chat_messages");
    const conversation = await getConversationDoc(clinicId, userId, contactId);
    if (!conversation._id) {
      throw new Error("Conversacion sin identificador.");
    }
    const rows = await messages
      .find({ conversationId: conversation._id, clinicId })
      .sort({ createdAt: 1 })
      .limit(200)
      .toArray();

    return {
      conversationId: conversation._id.toHexString(),
      items: rows.map(mapMessage),
    };
  }

  static async sendMessage(input: {
    clinicId: string;
    senderId: string;
    recipientId: string;
    text: string;
    attachment?: {
      url: string;
      fileName: string;
      fileType: string;
      fileSize: number;
    };
  }) {
    const text = input.text.trim();
    if (!text && !input.attachment) {
      throw new Error("Debes enviar un mensaje o un archivo.");
    }

    if (input.senderId === input.recipientId) {
      throw new Error("No puedes enviarte mensajes a ti mismo.");
    }

    await Promise.all([
      ensureChatParticipant(input.clinicId, input.senderId),
      ensureChatParticipant(input.clinicId, input.recipientId),
    ]);

    const db = await getMongoDb();
    const messages = db.collection<MessageDoc>("chat_messages");
    const conversations = db.collection<ConversationDoc>("chat_conversations");
    const now = new Date();
    const conversation = await getConversationDoc(
      input.clinicId,
      input.senderId,
      input.recipientId
    );
    if (!conversation._id) {
      throw new Error("Conversacion sin identificador.");
    }

    const messageDoc: MessageDoc = {
      conversationId: conversation._id,
      clinicId: input.clinicId,
      senderId: input.senderId,
      recipientId: input.recipientId,
      text,
      createdAt: now,
    };

    if (input.attachment) {
      messageDoc.attachmentUrl = input.attachment.url;
      messageDoc.attachmentName = input.attachment.fileName;
      messageDoc.attachmentType = input.attachment.fileType;
      messageDoc.attachmentSize = input.attachment.fileSize;
    }

    const result = await messages.insertOne(messageDoc);

    const lastText = text || `[Archivo: ${input.attachment?.fileName ?? "adjunto"}]`;
    await conversations.updateOne(
      { _id: conversation._id },
      {
        $set: {
          updatedAt: now,
          lastMessageText: lastText,
          lastMessageAt: now,
        },
      }
    );

    const saved = await messages.findOne({ _id: result.insertedId });
    if (!saved) {
      throw new Error("No se pudo guardar el mensaje.");
    }

    return mapMessage(saved);
  }
}
