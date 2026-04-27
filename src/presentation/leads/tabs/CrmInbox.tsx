"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

type MetaChannel = "WHATSAPP" | "INSTAGRAM" | "MESSENGER";
type MetaConversationStatus = "OPEN" | "PENDING" | "RESOLVED";

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
  direction: "INBOUND" | "OUTBOUND";
  senderType: "CONTACT" | "USER" | "SYSTEM";
  senderUserId: string | null;
  senderLabel: string;
  text: string;
  status: string;
  createdAt: string;
};

const CHANNEL_LABELS: Record<MetaChannel, string> = { WHATSAPP: "WhatsApp", INSTAGRAM: "Instagram", MESSENGER: "Messenger" };
const CHANNEL_STYLES: Record<MetaChannel, string> = { WHATSAPP: "bg-green-50 text-green-700", INSTAGRAM: "bg-pink-50 text-pink-700", MESSENGER: "bg-sky-50 text-sky-700" };

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(date, today)) return "Hoy";
  if (same(date, yesterday)) return "Ayer";
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" }).format(date);
}

export default function CrmInbox() {
  const [conversations, setConversations] = useState<MetaConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MetaMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [summary, setSummary] = useState({ total: 0, unread: 0 });
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/chat-meta/conversations", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setConversations(d.items ?? []);
          setSummary({ total: d.summary?.total ?? 0, unread: d.summary?.unread ?? 0 });
          if (d.items?.length) setSelectedId(d.items[0].id);
        } else {
          setError(d.error ?? "Error al cargar conversaciones");
        }
      })
      .catch(() => setError("Error al cargar conversaciones"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    fetch(`/api/chat-meta/messages?conversationId=${selectedId}`, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setMessages(d.items ?? []);
          setCurrentUserId(d.currentUserId ?? null);
        }
      })
      .finally(() => setMessagesLoading(false));
  }, [selectedId]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/chat-meta/conversations", { credentials: "include", cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) {
            setConversations(d.items ?? []);
            setSummary({ total: d.summary?.total ?? 0, unread: d.summary?.unread ?? 0 });
          }
        });

      if (selectedId) {
        fetch(`/api/chat-meta/messages?conversationId=${selectedId}`, { credentials: "include", cache: "no-store" })
          .then((r) => r.json())
          .then((d) => {
            if (d.ok) setMessages(d.items ?? []);
          });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, messagesLoading]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) =>
      [conversation.contact.displayName, conversation.contact.phone ?? "", conversation.contact.username ?? ""].join(" ").toLowerCase().includes(query)
    );
  }, [conversations, search]);

  const active = filtered.find((conversation) => conversation.id === selectedId) ?? conversations.find((conversation) => conversation.id === selectedId) ?? null;

  async function handleSend() {
    if (!active || !draft.trim()) return;
    setSending(true);
    try {
      const response = await fetch("/api/chat-meta/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversationId: active.id, text: draft.trim() }),
      });
      const data = await response.json();
      if (data.ok && data.item) {
        setMessages((prev) => [...prev, data.item]);
        setDraft("");
      } else {
        setError(data.error ?? "Error al enviar");
      }
    } catch {
      setError("Error al enviar");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center"><p className="text-sm text-slate-400">Cargando inbox...</p></div>;
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex w-[290px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{summary.total} conversaciones</span>
            {summary.unread > 0 ? <span className="rounded-full bg-[#19b3bc] px-2 py-0.5 text-[10px] font-semibold text-white">{summary.unread}</span> : null}
          </div>
          <div className="relative">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((conversation) => {
            const selected = conversation.id === selectedId;
            const initials = (conversation.contact.displayName || "?").split(/\s+/).slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("");

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setSelectedId(conversation.id)}
                className={`w-full border-b border-slate-100 px-3 py-2.5 text-left transition ${selected ? "bg-slate-50" : "hover:bg-slate-50/70"}`}
              >
                <div className="flex items-start gap-2.5">
                  {conversation.contact.avatarUrl ? (
                    <Image src={conversation.contact.avatarUrl} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">{initials}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold text-slate-800">{conversation.contact.displayName}</p>
                      <span className="ml-auto text-[10px] text-slate-400">{conversation.lastMessageAt ? formatDateLabel(conversation.lastMessageAt) : ""}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${CHANNEL_STYLES[conversation.channel]}`}>{CHANNEL_LABELS[conversation.channel]}</span>
                      {conversation.unreadCount > 0 ? <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-white">{conversation.unreadCount}</span> : null}
                    </div>
                    <p className="mt-1 truncate text-[11px] text-slate-400">{conversation.lastMessageText || "Sin mensajes"}</p>
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 ? <p className="py-8 text-center text-xs text-slate-400">Sin conversaciones</p> : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-slate-50/60">
        {active ? (
          <>
            <div className="border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                    {(active.contact.displayName || "?").split(/\s+/).slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{active.contact.displayName}</p>
                    <p className="truncate text-[11px] text-slate-400">{active.contact.phone || active.contact.username || ""}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${CHANNEL_STYLES[active.channel]}`}>{CHANNEL_LABELS[active.channel]}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {messagesLoading ? <p className="py-4 text-center text-xs text-slate-400">Cargando mensajes...</p> : null}
              {!messagesLoading && messages.length === 0 ? <p className="py-10 text-center text-xs text-slate-400">Sin mensajes aun</p> : null}

              <div className="space-y-2.5">
                {messages.map((message, index) => {
                  const own = message.direction === "OUTBOUND" || message.senderUserId === currentUserId;
                  const prev = messages[index - 1];
                  const showDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(message.createdAt).toDateString();

                  return (
                    <div key={message.id}>
                      {showDay ? (
                        <div className="flex items-center gap-2 py-2">
                          <div className="h-px flex-1 bg-slate-200" />
                          <span className="text-[10px] font-medium text-slate-400">{formatDateLabel(message.createdAt)}</span>
                          <div className="h-px flex-1 bg-slate-200" />
                        </div>
                      ) : null}

                      <div className={`flex ${own ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[72%] rounded-2xl px-3 py-2 ${own ? "bg-slate-800 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
                          <p className="text-sm leading-6">{message.text}</p>
                          <p className={`mt-1 text-right text-[10px] ${own ? "text-slate-300" : "text-slate-400"}`}>{formatTime(message.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white px-4 py-3">
              {error ? <p className="mb-2 text-xs text-rose-500">{error}</p> : null}
              <div className="flex items-end gap-2.5">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder={`Responder por ${CHANNEL_LABELS[active.channel]}...`}
                  className="min-h-[42px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                />
                <button type="button" onClick={() => void handleSend()} disabled={sending || !draft.trim()} className="rounded-xl bg-[#19b3bc] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#159ea7] disabled:bg-slate-300">
                  {sending ? "..." : "Enviar"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <p className="text-sm font-medium text-slate-600">Selecciona una conversacion</p>
              <p className="mt-1 text-xs text-slate-400">WhatsApp, Instagram y Messenger</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
