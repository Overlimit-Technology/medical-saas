"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type MetaChannel = "WHATSAPP" | "INSTAGRAM" | "MESSENGER";
type MetaConversationStatus = "OPEN" | "PENDING" | "RESOLVED";
type MetaMessageDirection = "INBOUND" | "OUTBOUND";
type MetaMessageStatus = "RECEIVED" | "QUEUED" | "SENT" | "DELIVERED" | "FAILED";

type MetaConversation = {
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

type MetaMessage = {
  id: string;
  conversationId: string;
  channel: MetaChannel;
  direction: MetaMessageDirection;
  senderType: "CONTACT" | "USER" | "SYSTEM";
  senderUserId: string | null;
  senderLabel: string;
  text: string;
  status: MetaMessageStatus;
  createdAt: string;
};

type MetaConversationsPayload = {
  ok: boolean;
  items?: MetaConversation[];
  summary?: {
    total: number;
    whatsapp: number;
    instagram: number;
    messenger: number;
    unread: number;
  };
  error?: string;
};

type MetaMessagesPayload = {
  ok: boolean;
  currentUserId?: string;
  conversation?: MetaConversation;
  items?: MetaMessage[];
  item?: MetaMessage;
  error?: string;
};

const CHANNEL_LABELS: Record<MetaChannel, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  MESSENGER: "Messenger",
};

const STATUS_LABELS: Record<MetaConversationStatus, string> = {
  OPEN: "Abierto",
  PENDING: "Pendiente",
  RESOLVED: "Resuelto",
};

const CHANNEL_STYLES: Record<MetaChannel, string> = {
  WHATSAPP: "bg-emerald-100 text-emerald-700 border-emerald-200",
  INSTAGRAM: "bg-rose-100 text-rose-700 border-rose-200",
  MESSENGER: "bg-sky-100 text-sky-700 border-sky-200",
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const sameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  if (sameDay(date, today)) return "Hoy";
  if (sameDay(date, yesterday)) return "Ayer";

  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatFullDate(value: string | null) {
  if (!value) return "Sin actividad";

  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M21 3 10 14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m21 3-7 18-4-7-7-4 18-7Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChannelBadge({ channel }: { channel: MetaChannel }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${CHANNEL_STYLES[channel]}`}>
      {CHANNEL_LABELS[channel]}
    </span>
  );
}

function ContactAvatar({
  conversation,
  selected = false,
}: {
  conversation: MetaConversation;
  selected?: boolean;
}) {
  const avatar = conversation.contact.avatarUrl;
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={conversation.contact.displayName}
        className="h-12 w-12 rounded-[18px] object-cover"
      />
    );
  }

  const label = conversation.contact.displayName || conversation.contact.phone || "CM";
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-[18px] text-sm font-semibold ${
        selected
          ? "bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)] text-slate-800"
          : "bg-[linear-gradient(135deg,#d1fae5,#ecfdf5)] text-emerald-700"
      }`}
    >
      {initials}
    </div>
  );
}

export default function ChatMetaPage() {
  const [conversations, setConversations] = useState<MetaConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<MetaMessage[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    whatsapp: 0,
    instagram: 0,
    messenger: 0,
    unread: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<MetaConversation | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  async function loadConversations(showLoader = false) {
    if (showLoader) setLoading(true);

    try {
      const res = await fetch("/api/chat-meta/conversations", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as MetaConversationsPayload;

      if (!data.ok) {
        setError(data.error ?? "No se pudieron cargar las conversaciones Meta.");
        setConversations([]);
        setSelectedId(null);
        return;
      }

      const nextItems = data.items ?? [];
      setConversations(nextItems);
      setSummary(
        data.summary ?? {
          total: nextItems.length,
          whatsapp: 0,
          instagram: 0,
          messenger: 0,
          unread: 0,
        }
      );
      setSelectedId((current) => {
        if (current && nextItems.some((item) => item.id === current)) return current;
        return nextItems[0]?.id ?? null;
      });
    } catch {
      setError("No se pudieron cargar las conversaciones Meta.");
      setConversations([]);
      setSelectedId(null);
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  async function loadMessages(conversationId: string, showLoader = false) {
    if (!conversationId) {
      setMessages([]);
      setSelectedConversation(null);
      return;
    }

    if (showLoader) setMessagesLoading(true);

    try {
      const res = await fetch(`/api/chat-meta/messages?conversationId=${conversationId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as MetaMessagesPayload;

      if (!data.ok) {
        setError(data.error ?? "No se pudieron cargar los mensajes.");
        setMessages([]);
        return;
      }

      setMessages(data.items ?? []);
      setCurrentUserId(data.currentUserId ?? null);
      setSelectedConversation(data.conversation ?? null);
    } catch {
      setError("No se pudieron cargar los mensajes.");
      setMessages([]);
    } finally {
      if (showLoader) setMessagesLoading(false);
    }
  }

  useEffect(() => {
    setError(null);
    void loadConversations(true);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setSelectedConversation(null);
      return;
    }

    setError(null);
    void loadMessages(selectedId, true);
  }, [selectedId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadConversations(false);
      if (selectedId) {
        void loadMessages(selectedId, false);
      }
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [selectedId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, messagesLoading, selectedId]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((conversation) => {
      const haystack = [
        conversation.contact.displayName,
        conversation.contact.phone ?? "",
        conversation.contact.username ?? "",
        CHANNEL_LABELS[conversation.channel],
        conversation.lastMessageText ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [conversations, search]);

  const activeConversation =
    selectedConversation ??
    filteredConversations.find((conversation) => conversation.id === selectedId) ??
    conversations.find((conversation) => conversation.id === selectedId) ??
    null;

  async function handleSendMessage() {
    if (!activeConversation) return;

    const text = draft.trim();
    if (!text) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat-meta/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conversationId: activeConversation.id,
          text,
        }),
      });
      const data = (await res.json()) as MetaMessagesPayload;

      if (!data.ok || !data.item) {
        setError(data.error ?? "No se pudo enviar el mensaje.");
        return;
      }

      setMessages((current) => [...current, data.item as MetaMessage]);
      setDraft("");
      void loadConversations(false);
    } catch {
      setError("No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-slate-500">CRM</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">CRM</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            WhatsApp, Instagram y Facebook Messenger en una sola vista, sin alterar el chat
            interno actual de ZENSYA H.I.S.
          </p>
        </div>

        <div className="flex flex-col gap-4 lg:items-end">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
            <Link
              href="/crm"
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              CRM
            </Link>
            <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Chat Meta
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-[26px] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Conversaciones</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total}</p>
          </div>
          <div className="rounded-[26px] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">No leidos</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.unread}</p>
          </div>
          <div className="rounded-[26px] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">WhatsApp</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.whatsapp}</p>
          </div>
          <div className="rounded-[26px] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">IG / FB</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {summary.instagram + summary.messenger}
            </p>
          </div>
        </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden xl:grid-cols-[340px_minmax(0,1fr)_320px]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_30px_80px_-45px_rgba(15,23,42,0.45)]">
          <div className="border-b border-slate-100 px-5 pb-5 pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Canales</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Conversaciones externas</p>
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                Meta inbox
              </div>
            </div>

            <label className="mt-5 flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-slate-400 transition focus-within:border-slate-300 focus-within:bg-white">
              <SearchIcon />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por canal, nombre o telefono"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="animate-pulse rounded-[26px] border border-slate-100 bg-white px-4 py-4"
                  >
                    <div className="h-4 w-32 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {filteredConversations.map((conversation) => {
                const selected = conversation.id === activeConversation?.id;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={`w-full rounded-[28px] border px-4 py-4 text-left transition ${
                      selected
                        ? "border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fafc)] shadow-[0_20px_45px_-35px_rgba(15,23,42,0.4)]"
                        : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <ContactAvatar conversation={conversation} selected={selected} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {conversation.contact.displayName}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            {conversation.lastMessageAt
                              ? formatDateLabel(conversation.lastMessageAt)
                              : "Nuevo"}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <ChannelBadge channel={conversation.channel} />
                          {conversation.unreadCount > 0 ? (
                            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white">
                              {conversation.unreadCount} nuevos
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 truncate text-xs text-slate-500">
                          {conversation.lastMessageText || "Sin mensajes recientes"}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {conversation.contact.phone ||
                            conversation.contact.username ||
                            conversation.contact.externalUserId}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-[36px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.96))] shadow-[0_30px_80px_-45px_rgba(15,23,42,0.45)]">
          {activeConversation ? (
            <>
              <div className="border-b border-slate-100 px-6 py-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <ContactAvatar conversation={activeConversation} selected />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                          {activeConversation.contact.displayName}
                        </h2>
                        <ChannelBadge channel={activeConversation.channel} />
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {STATUS_LABELS[activeConversation.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {activeConversation.contact.phone ||
                          activeConversation.contact.username ||
                          activeConversation.contact.externalUserId}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:w-auto">
                    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mensajes</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{messages.length}</p>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Asignado</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {activeConversation.assignedToLabel || "Sin asignar"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.12),transparent_26%),linear-gradient(180deg,#fcfcfd_0%,#f8fafc_100%)] px-5 py-5">
                <div className="flex h-full min-h-0 flex-col gap-4">
                  <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    <div className="space-y-4">
                      {messagesLoading && (
                        <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                          Cargando mensajes...
                        </div>
                      )}

                      {!messagesLoading && messages.length === 0 && (
                        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                          Esta conversacion aun no tiene mensajes.
                        </div>
                      )}

                      {messages.map((message, index) => {
                        const own =
                          message.direction === "OUTBOUND" || message.senderUserId === currentUserId;
                        const previousMessage = messages[index - 1];
                        const showDayDivider =
                          !previousMessage ||
                          new Date(previousMessage.createdAt).toDateString() !==
                            new Date(message.createdAt).toDateString();

                        return (
                          <div key={message.id} className="space-y-4">
                            {showDayDivider && (
                              <div className="flex items-center gap-3 py-2">
                                <div className="h-px flex-1 bg-slate-200" />
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                                  {formatDateLabel(message.createdAt)}
                                </span>
                                <div className="h-px flex-1 bg-slate-200" />
                              </div>
                            )}

                            <div
                              className={`flex items-end gap-3 ${own ? "justify-end" : "justify-start"}`}
                            >
                              {!own && <ContactAvatar conversation={activeConversation} />}

                              <div
                                className={`max-w-[78%] rounded-[26px] px-4 py-3 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.35)] ${
                                  own
                                    ? "bg-[linear-gradient(135deg,#0f172a,#334155)] text-white"
                                    : "border border-white/80 bg-white text-slate-700"
                                }`}
                              >
                                <div className="flex items-center gap-2 pb-2">
                                  <span
                                    className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                                      own
                                        ? "bg-white/10 text-slate-100"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {own ? "ZENSYA" : CHANNEL_LABELS[message.channel]}
                                  </span>
                                  <span
                                    className={`text-[11px] ${
                                      own ? "text-slate-300" : "text-slate-400"
                                    }`}
                                  >
                                    {message.senderLabel}
                                  </span>
                                </div>
                                <p className="text-sm leading-6">{message.text}</p>
                                <div className="mt-2 flex items-center justify-end gap-2">
                                  <p
                                    className={`text-[11px] ${
                                      own ? "text-slate-300" : "text-slate-400"
                                    }`}
                                  >
                                    {formatTime(message.createdAt)}
                                  </p>
                                  {own ? (
                                    <span className="text-[11px] text-slate-300">
                                      {message.status.toLowerCase()}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={endRef} />
                    </div>
                  </div>

                  <div className="shrink-0 rounded-[30px] border border-white/80 bg-white/90 p-3 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.35)] backdrop-blur">
                    <div className="mb-3 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                      Base preparada para Meta API. Hoy los mensajes salientes se guardan como
                      pendientes de despacho del proveedor.
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row md:items-end">
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        rows={3}
                        placeholder={`Responder por ${CHANNEL_LABELS[activeConversation.channel]}`}
                        className="min-h-[96px] flex-1 resize-none rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={sending || !draft.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <SendIcon />
                        {sending ? "Enviando..." : "Responder"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[72vh] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.14),transparent_30%),linear-gradient(180deg,#ffffff,#f8fafc)] px-6 text-center">
              <div className="max-w-md rounded-[32px] border border-dashed border-slate-200 bg-white/90 px-8 py-10 shadow-sm">
                <p className="text-lg font-semibold text-slate-900">Selecciona una conversacion</p>
                <p className="mt-2 text-sm text-slate-500">
                  El hilo central mostrara mensajes externos de WhatsApp, Instagram o Facebook
                  Messenger.
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_30px_80px_-45px_rgba(15,23,42,0.45)]">
          {activeConversation ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Contacto</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    {activeConversation.contact.displayName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Ultima actividad: {formatFullDate(activeConversation.lastMessageAt)}
                  </p>
                </div>
                <ContactAvatar conversation={activeConversation} selected />
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Canal</p>
                  <div className="mt-3">
                    <ChannelBadge channel={activeConversation.channel} />
                  </div>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Telefono / ID</p>
                  <p className="mt-3 break-words text-sm font-medium text-slate-900">
                    {activeConversation.contact.phone || activeConversation.contact.externalUserId}
                  </p>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Usuario social</p>
                  <p className="mt-3 break-words text-sm font-medium text-slate-900">
                    {activeConversation.contact.username || "No informado"}
                  </p>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Estado</p>
                  <p className="mt-3 text-sm font-medium text-slate-900">
                    {STATUS_LABELS[activeConversation.status]}
                  </p>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Asignado a</p>
                  <p className="mt-3 text-sm font-medium text-slate-900">
                    {activeConversation.assignedToLabel || "Pendiente de asignacion"}
                  </p>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Notas</p>
                  <p className="mt-3 text-sm font-medium text-slate-900">
                    {activeConversation.contact.notes ||
                      "Espacio listo para relacionar este contacto con CRM, pacientes o seguimiento comercial."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div className="max-w-xs">
                <p className="text-base font-semibold text-slate-900">Sin contacto activo</p>
                <p className="mt-2 text-sm text-slate-500">
                  Al seleccionar una conversacion veras aqui sus datos, canal e informacion de
                  seguimiento.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
