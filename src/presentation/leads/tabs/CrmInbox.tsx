"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

function formatTime(v: string) {
  return new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit" }).format(new Date(v));
}

function formatDateLabel(v: string) {
  const d = new Date(v); const t = new Date(); const y = new Date(); y.setDate(y.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, t)) return "Hoy"; if (same(d, y)) return "Ayer";
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" }).format(d);
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
        } else { setError(d.error ?? "Error al cargar conversaciones"); }
      })
      .catch(() => setError("Error al cargar conversaciones"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    setMessagesLoading(true);
    fetch(`/api/chat-meta/messages?conversationId=${selectedId}`, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.ok) { setMessages(d.items ?? []); setCurrentUserId(d.currentUserId ?? null); } })
      .finally(() => setMessagesLoading(false));
  }, [selectedId]);

  useEffect(() => {
    const id = setInterval(() => {
      fetch("/api/chat-meta/conversations", { credentials: "include", cache: "no-store" })
        .then((r) => r.json())
        .then((d) => { if (d.ok) { setConversations(d.items ?? []); setSummary({ total: d.summary?.total ?? 0, unread: d.summary?.unread ?? 0 }); } });
      if (selectedId) {
        fetch(`/api/chat-meta/messages?conversationId=${selectedId}`, { credentials: "include", cache: "no-store" })
          .then((r) => r.json())
          .then((d) => { if (d.ok) { setMessages(d.items ?? []); } });
      }
    }, 5000);
    return () => clearInterval(id);
  }, [selectedId]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages, messagesLoading]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      [c.contact.displayName, c.contact.phone ?? "", c.contact.username ?? ""]
        .join(" ").toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const active = filtered.find((c) => c.id === selectedId) ?? conversations.find((c) => c.id === selectedId) ?? null;

  async function handleSend() {
    if (!active || !draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/chat-meta/messages", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ conversationId: active.id, text: draft.trim() }),
      });
      const d = await res.json();
      if (d.ok && d.item) { setMessages((p) => [...p, d.item]); setDraft(""); }
      else setError(d.error ?? "Error al enviar");
    } catch { setError("Error al enviar"); }
    finally { setSending(false); }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-400">Cargando inbox...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar - conversations list */}
      <div className="w-80 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-700">{summary.total} conversaciones</span>
            {summary.unread > 0 && (
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-white">{summary.unread} sin leer</span>
            )}
          </div>
          <div className="relative">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((conv) => {
            const sel = conv.id === selectedId;
            const initials = (conv.contact.displayName || "?").split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");
            return (
              <button
                key={conv.id} type="button" onClick={() => setSelectedId(conv.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 transition ${sel ? "bg-slate-50" : "hover:bg-slate-50/50"}`}
              >
                <div className="flex items-start gap-3">
                  {conv.contact.avatarUrl ? (
                    <img src={conv.contact.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{initials}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800 truncate">{conv.contact.displayName}</p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {conv.lastMessageAt ? formatDateLabel(conv.lastMessageAt) : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${CHANNEL_STYLES[conv.channel]}`}>
                        {CHANNEL_LABELS[conv.channel]}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-white">{conv.unreadCount}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-1">{conv.lastMessageText || "Sin mensajes"}</p>
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8">Sin conversaciones</p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-slate-50/50">
        {active ? (
          <>
            {/* Chat header */}
            <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {(active.contact.displayName || "?").split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{active.contact.displayName}</p>
                    <p className="text-[11px] text-slate-400">{active.contact.phone || active.contact.username || ""}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${CHANNEL_STYLES[active.channel]}`}>
                  {CHANNEL_LABELS[active.channel]}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {messagesLoading && <p className="text-xs text-slate-400 text-center py-4">Cargando mensajes...</p>}
              {!messagesLoading && messages.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-12">Sin mensajes aun</p>
              )}
              <div className="space-y-3">
                {messages.map((msg, idx) => {
                  const own = msg.direction === "OUTBOUND" || msg.senderUserId === currentUserId;
                  const prev = messages[idx - 1];
                  const showDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
                  return (
                    <div key={msg.id}>
                      {showDay && (
                        <div className="flex items-center gap-3 py-3">
                          <div className="h-px flex-1 bg-slate-200" />
                          <span className="text-[10px] font-medium text-slate-400">{formatDateLabel(msg.createdAt)}</span>
                          <div className="h-px flex-1 bg-slate-200" />
                        </div>
                      )}
                      <div className={`flex ${own ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          own
                            ? "bg-slate-800 text-white"
                            : "bg-white border border-slate-200 text-slate-700"
                        }`}>
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                          <p className={`mt-1 text-[10px] text-right ${own ? "text-slate-400" : "text-slate-400"}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
            </div>

            {/* Input */}
            <div className="shrink-0 bg-white border-t border-slate-200 px-5 py-3">
              {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
              <div className="flex items-end gap-3">
                <textarea
                  value={draft} onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder={`Responder por ${CHANNEL_LABELS[active.channel]}...`}
                  className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <button
                  type="button" onClick={handleSend} disabled={sending || !draft.trim()}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:bg-slate-300"
                >
                  {sending ? "..." : "Enviar"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600">Selecciona una conversacion</p>
              <p className="mt-1 text-xs text-slate-400">Mensajes de WhatsApp, Instagram y Messenger</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
