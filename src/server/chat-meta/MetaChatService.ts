import { ObjectId } from "mongodb";
import { prisma } from "@/lib/prisma";
import { getMongoDb } from "@/lib/mongodb";

export type MetaChannel = "WHATSAPP" | "INSTAGRAM" | "MESSENGER";
export type MetaConversationStatus = "OPEN" | "PENDING" | "RESOLVED";
export type MetaMessageDirection = "INBOUND" | "OUTBOUND";
export type MetaSenderType = "CONTACT" | "USER" | "SYSTEM";
export type MetaMessageStatus = "RECEIVED" | "QUEUED" | "SENT" | "DELIVERED" | "FAILED";

type MetaConversationDoc = {
  _id?: ObjectId;
  clinicId: string;
  channel: MetaChannel;
  status: MetaConversationStatus;
  contact: {
    externalUserId: string;
    displayName: string;
    phone: string | null;
    username: string | null;
    avatarUrl: string | null;
    notes: string | null;
  };
  assignedToUserId: string | null;
  assignedToLabel: string | null;
  lastMessageText: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
  metaThreadId: string | null;
  metaAccountId: string | null;
};

type MetaMessageDoc = {
  _id?: ObjectId;
  conversationId: ObjectId;
  clinicId: string;
  channel: MetaChannel;
  direction: MetaMessageDirection;
  senderType: MetaSenderType;
  senderUserId: string | null;
  senderLabel: string;
  text: string;
  status: MetaMessageStatus;
  externalMessageId: string | null;
  attachments: Array<{
    type: string;
    url: string | null;
    mimeType: string | null;
    name: string | null;
  }>;
  createdAt: Date;
  rawPayload: Record<string, unknown> | null;
};

export type MetaConversationListItem = {
  id: string;
  channel: MetaChannel;
  status: MetaConversationStatus;
  unreadCount: number;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  assignedToUserId: string | null;
  assignedToLabel: string | null;
  contact: {
    externalUserId: string;
    displayName: string;
    phone: string | null;
    username: string | null;
    avatarUrl: string | null;
    notes: string | null;
  };
};

export type MetaMessageItem = {
  id: string;
  conversationId: string;
  channel: MetaChannel;
  direction: MetaMessageDirection;
  senderType: MetaSenderType;
  senderUserId: string | null;
  senderLabel: string;
  text: string;
  status: MetaMessageStatus;
  createdAt: string;
};

let indexPromise: Promise<void> | null = null;

function getMetaConversationsCollection() {
  return getMongoDb().then((db) => db.collection<MetaConversationDoc>("meta_chat_conversations"));
}

function getMetaMessagesCollection() {
  return getMongoDb().then((db) => db.collection<MetaMessageDoc>("meta_chat_messages"));
}

async function ensureIndexes() {
  if (!indexPromise) {
    indexPromise = (async () => {
      const conversations = await getMetaConversationsCollection();
      const messages = await getMetaMessagesCollection();

      await conversations.createIndex({ clinicId: 1, updatedAt: -1 });
      await conversations.createIndex(
        { clinicId: 1, channel: 1, "contact.externalUserId": 1 },
        { unique: true }
      );
      await messages.createIndex({ conversationId: 1, createdAt: 1 });
      await messages.createIndex({ clinicId: 1, channel: 1, createdAt: -1 });
      await messages.createIndex({ externalMessageId: 1 }, { sparse: true });
    })();
  }

  return indexPromise;
}

async function ensureMetaAccess(clinicId: string, userId: string) {
  const membership = await prisma.clinicMembership.findFirst({
    where: {
      clinicId,
      userId,
      status: "ACTIVE",
      user: {
        status: "ACTIVE",
      },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new Error("No tienes acceso a la sede actual.");
  }
}

async function getUserDisplayLabel(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!user) return "Equipo ZENSYA";

  const name = `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim();
  return name || user.email;
}

function mapConversation(doc: MetaConversationDoc): MetaConversationListItem {
  if (!doc._id) {
    throw new Error("Conversacion meta sin identificador.");
  }

  return {
    id: doc._id.toHexString(),
    channel: doc.channel,
    status: doc.status,
    unreadCount: doc.unreadCount,
    lastMessageText: doc.lastMessageText,
    lastMessageAt: doc.lastMessageAt ? doc.lastMessageAt.toISOString() : null,
    assignedToUserId: doc.assignedToUserId,
    assignedToLabel: doc.assignedToLabel,
    contact: {
      externalUserId: doc.contact.externalUserId,
      displayName: doc.contact.displayName,
      phone: doc.contact.phone,
      username: doc.contact.username,
      avatarUrl: doc.contact.avatarUrl,
      notes: doc.contact.notes,
    },
  };
}

function mapMessage(doc: MetaMessageDoc): MetaMessageItem {
  if (!doc._id) {
    throw new Error("Mensaje meta sin identificador.");
  }

  return {
    id: doc._id.toHexString(),
    conversationId: doc.conversationId.toHexString(),
    channel: doc.channel,
    direction: doc.direction,
    senderType: doc.senderType,
    senderUserId: doc.senderUserId,
    senderLabel: doc.senderLabel,
    text: doc.text,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
  };
}

async function findConversationById(clinicId: string, conversationId: string) {
  if (!ObjectId.isValid(conversationId)) {
    throw new Error("Conversacion no valida.");
  }

  await ensureIndexes();
  const conversations = await getMetaConversationsCollection();
  const conversation = await conversations.findOne({
    _id: new ObjectId(conversationId),
    clinicId,
  });

  if (!conversation || !conversation._id) {
    throw new Error("Conversacion no encontrada.");
  }

  return conversation;
}

function sanitizeIncomingText(text: string | null | undefined) {
  return (text ?? "").trim();
}

async function upsertExternalConversation(input: {
  clinicId: string;
  channel: MetaChannel;
  externalUserId: string;
  displayName: string;
  phone?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  notes?: string | null;
  metaThreadId?: string | null;
  metaAccountId?: string | null;
  incomingText?: string | null;
  incomingAt?: Date;
}) {
  await ensureIndexes();

  const conversations = await getMetaConversationsCollection();
  const now = input.incomingAt ?? new Date();
  const safeDisplayName = input.displayName.trim() || "Contacto Meta";

  await conversations.updateOne(
    {
      clinicId: input.clinicId,
      channel: input.channel,
      "contact.externalUserId": input.externalUserId,
    },
    {
      $setOnInsert: {
        clinicId: input.clinicId,
        channel: input.channel,
        status: "OPEN" satisfies MetaConversationStatus,
        assignedToUserId: null,
        assignedToLabel: null,
        createdAt: now,
      },
      $set: {
        updatedAt: now,
        lastMessageText: input.incomingText ?? null,
        lastMessageAt: now,
        metaThreadId: input.metaThreadId ?? null,
        metaAccountId: input.metaAccountId ?? null,
        "contact.externalUserId": input.externalUserId,
        "contact.displayName": safeDisplayName,
        "contact.phone": input.phone ?? null,
        "contact.username": input.username ?? null,
        "contact.avatarUrl": input.avatarUrl ?? null,
        "contact.notes": input.notes ?? null,
      },
      $inc: {
        unreadCount: 1,
      },
    },
    { upsert: true }
  );

  const conversation = await conversations.findOne({
    clinicId: input.clinicId,
    channel: input.channel,
    "contact.externalUserId": input.externalUserId,
  });

  if (!conversation || !conversation._id) {
    throw new Error("No se pudo crear la conversacion Meta.");
  }

  return conversation;
}

export class MetaChatService {
  static async listConversations(clinicId: string, userId: string) {
    await ensureMetaAccess(clinicId, userId);
    await ensureIndexes();

    const conversations = await getMetaConversationsCollection();
    const rows = await conversations.find({ clinicId }).sort({ updatedAt: -1 }).limit(100).toArray();

    const items = rows.map(mapConversation);
    const summary = {
      total: items.length,
      whatsapp: items.filter((item) => item.channel === "WHATSAPP").length,
      instagram: items.filter((item) => item.channel === "INSTAGRAM").length,
      messenger: items.filter((item) => item.channel === "MESSENGER").length,
      unread: items.reduce((acc, item) => acc + item.unreadCount, 0),
    };

    return { items, summary };
  }

  static async listMessages(clinicId: string, userId: string, conversationId: string) {
    await ensureMetaAccess(clinicId, userId);
    const conversation = await findConversationById(clinicId, conversationId);
    const messages = await getMetaMessagesCollection();

    const rows = await messages
      .find({ clinicId, conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .limit(300)
      .toArray();

    const conversations = await getMetaConversationsCollection();
    await conversations.updateOne(
      { _id: conversation._id, clinicId },
      { $set: { unreadCount: 0, updatedAt: new Date() } }
    );

    return {
      conversation: mapConversation(conversation),
      items: rows.map(mapMessage),
    };
  }

  static async sendMessage(input: {
    clinicId: string;
    userId: string;
    conversationId: string;
    text: string;
  }) {
    await ensureMetaAccess(input.clinicId, input.userId);

    const text = input.text.trim();
    if (!text) {
      throw new Error("El mensaje no puede estar vacio.");
    }

    const conversation = await findConversationById(input.clinicId, input.conversationId);
    const messages = await getMetaMessagesCollection();
    const conversations = await getMetaConversationsCollection();
    const now = new Date();
    const senderLabel = await getUserDisplayLabel(input.userId);

    const result = await messages.insertOne({
      conversationId: conversation._id,
      clinicId: input.clinicId,
      channel: conversation.channel,
      direction: "OUTBOUND",
      senderType: "USER",
      senderUserId: input.userId,
      senderLabel,
      text,
      status: "QUEUED",
      externalMessageId: null,
      attachments: [],
      createdAt: now,
      rawPayload: {
        integrationReady: true,
        pendingProviderDispatch: true,
      },
    });

    await conversations.updateOne(
      { _id: conversation._id, clinicId: input.clinicId },
      {
        $set: {
          assignedToUserId: input.userId,
          assignedToLabel: senderLabel,
          updatedAt: now,
          lastMessageText: text,
          lastMessageAt: now,
          unreadCount: 0,
        },
      }
    );

    const saved = await messages.findOne({ _id: result.insertedId });
    if (!saved) {
      throw new Error("No se pudo guardar el mensaje.");
    }

    return mapMessage(saved);
  }

  static async ingestInboundMessage(input: {
    clinicId: string;
    channel: MetaChannel;
    externalUserId: string;
    displayName: string;
    phone?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    notes?: string | null;
    text: string;
    occurredAt?: Date;
    externalMessageId?: string | null;
    metaThreadId?: string | null;
    metaAccountId?: string | null;
    rawPayload?: Record<string, unknown> | null;
  }) {
    const text = sanitizeIncomingText(input.text);
    if (!text) {
      throw new Error("El mensaje entrante no contiene texto.");
    }

    const conversation = await upsertExternalConversation({
      clinicId: input.clinicId,
      channel: input.channel,
      externalUserId: input.externalUserId,
      displayName: input.displayName,
      phone: input.phone,
      username: input.username,
      avatarUrl: input.avatarUrl,
      notes: input.notes,
      metaThreadId: input.metaThreadId,
      metaAccountId: input.metaAccountId,
      incomingText: text,
      incomingAt: input.occurredAt,
    });

    const messages = await getMetaMessagesCollection();
    const createdAt = input.occurredAt ?? new Date();
    const result = await messages.insertOne({
      conversationId: conversation._id as ObjectId,
      clinicId: input.clinicId,
      channel: input.channel,
      direction: "INBOUND",
      senderType: "CONTACT",
      senderUserId: null,
      senderLabel: input.displayName.trim() || "Contacto Meta",
      text,
      status: "RECEIVED",
      externalMessageId: input.externalMessageId ?? null,
      attachments: [],
      createdAt,
      rawPayload: input.rawPayload ?? null,
    });

    const saved = await messages.findOne({ _id: result.insertedId });
    if (!saved) {
      throw new Error("No se pudo guardar el mensaje entrante.");
    }

    return mapMessage(saved);
  }
}
