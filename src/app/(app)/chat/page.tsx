"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ContactRole = "ADMIN" | "DOCTOR" | "SECRETARY";

type Contact = {
  id: string;
  email: string;
  role: ContactRole;
  image: string | null;
  firstName: string;
  lastName: string;
  specialty: string | null;
  isOnline: boolean;
};

type ChatPayload = {
  ok: boolean;
  clinic?: {
    id: string;
    name: string;
    city: string;
  } | null;
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

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
};

const ROLE_LABELS: Record<ContactRole, string> = {
  ADMIN: "Administrador",
  DOCTOR: "Doctor",
  SECRETARY: "Secretaria",
};

function getDisplayName(contact: Contact) {
  const fullName = `${contact.firstName} ${contact.lastName}`.trim();
  return fullName || contact.email;
}

function getInitials(contact: Contact) {
  const seed = `${contact.firstName} ${contact.lastName}`.trim() || contact.email;
  return seed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMessageDayLabel(value: string) {
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
    month: "long",
    year: "numeric",
  }).format(date);
}

function ContactAvatar({
  contact,
  selected = false,
  className = "h-12 w-12 rounded-[18px] text-sm",
}: {
  contact: Contact;
  selected?: boolean;
  className?: string;
}) {
  if (contact.image) {
    return (
      <img
        src={contact.image}
        alt={getDisplayName(contact)}
        className={`${className} object-cover`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center font-semibold ${
        selected
          ? "bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)] text-slate-800"
          : "bg-[linear-gradient(135deg,#dbeafe,#eff6ff)] text-sky-700"
      } ${className}`}
    >
      {getInitials(contact)}
    </div>
  );
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

export default function ChatPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [clinicLabel, setClinicLabel] = useState("Sede actual");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  async function loadContacts(showLoader = false) {
    if (showLoader) setLoading(true);

    try {
      const res = await fetch("/api/chat/contacts", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as ChatPayload;

      if (!data.ok) {
        setError(data.error ?? "No se pudieron cargar los contactos.");
        setContacts([]);
        setSelectedId(null);
        return;
      }

      const nextContacts = data.items ?? [];
      setContacts(nextContacts);
      setSelectedId((current) => {
        if (current && nextContacts.some((contact) => contact.id === current)) return current;
        return nextContacts[0]?.id ?? null;
      });

      if (data.clinic) {
        setClinicLabel(`${data.clinic.name} - ${data.clinic.city}`);
      }
    } catch {
      setError("No se pudieron cargar los contactos.");
      setContacts([]);
      setSelectedId(null);
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  async function loadMessages(contactId: string, showLoader = false) {
    if (!contactId) {
      setMessages([]);
      return;
    }

    if (showLoader) setMessagesLoading(true);

    try {
      const res = await fetch(`/api/chat/messages?contactId=${contactId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as MessagesPayload;

      if (!data.ok) {
        setError(data.error ?? "No se pudieron cargar los mensajes.");
        setMessages([]);
        return;
      }

      setCurrentUserId(data.currentUserId ?? null);
      setMessages(data.items ?? []);
    } catch {
      setError("No se pudieron cargar los mensajes.");
      setMessages([]);
    } finally {
      if (showLoader) setMessagesLoading(false);
    }
  }

  useEffect(() => {
    setError(null);
    void loadContacts(true);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    setError(null);
    void loadMessages(selectedId, true);
  }, [selectedId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadContacts(false);
      if (selectedId) {
        void loadMessages(selectedId, false);
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, messagesLoading, selectedId]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((contact) => {
      const haystack = [
        getDisplayName(contact),
        contact.email,
        ROLE_LABELS[contact.role],
        contact.specialty ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [contacts, search]);

  const selectedContact =
    filteredContacts.find((contact) => contact.id === selectedId) ??
    contacts.find((contact) => contact.id === selectedId) ??
    null;

  const onlineCount = contacts.filter((contact) => contact.isOnline).length;
  const handleSendMessage = async () => {
    if (!selectedContact) return;

    const text = draft.trim();
    if (!text) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          recipientId: selectedContact.id,
          text,
        }),
      });
      const data = (await res.json()) as MessagesPayload;

      if (!data.ok || !data.item) {
        setError(data.error ?? "No se pudo enviar el mensaje.");
        return;
      }

      setMessages((current) => [...current, data.item as ChatMessage]);
      setDraft("");
    } catch {
      setError("No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.34em] text-slate-400">
            Comunicacion interna
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Centro de mensajes
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:w-auto">
          <div className="rounded-[26px] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Contactos</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{contacts.length}</p>
          </div>
          <div className="rounded-[26px] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">En linea</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{onlineCount}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_30px_80px_-45px_rgba(15,23,42,0.45)]">
          <div className="border-b border-slate-100 px-5 pb-5 pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Bandeja</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Usuarios de la sede</p>
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                {clinicLabel}
              </div>
            </div>

            <label className="mt-5 flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-slate-400 transition focus-within:border-slate-300 focus-within:bg-white">
              <SearchIcon />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, correo o rol"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => (
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

            {!loading && filteredContacts.length === 0 && (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">Sin contactos para mostrar</p>
                <p className="mt-2 text-sm text-slate-500">
                  Cuando existan mas usuarios activos en esta sede apareceran aqui.
                </p>
              </div>
            )}

            <div className="space-y-2">
              {filteredContacts.map((contact) => {
                const selected = contact.id === selectedContact?.id;
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setSelectedId(contact.id)}
                    className={`w-full rounded-[28px] border px-4 py-4 text-left transition ${
                      selected
                        ? "border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fafc)] shadow-[0_20px_45px_-35px_rgba(15,23,42,0.4)]"
                        : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <ContactAvatar contact={contact} selected={selected} />
                        <span
                          className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                            contact.isOnline ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {getDisplayName(contact)}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            {contact.isOnline ? "Activo" : "Offline"}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {ROLE_LABELS[contact.role]}
                          {contact.specialty ? ` - ${contact.specialty}` : ""}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-400">{contact.email}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-[36px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.96))] shadow-[0_30px_80px_-45px_rgba(15,23,42,0.45)]">
          {selectedContact ? (
            <>
              <div className="border-b border-slate-100 px-6 py-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <ContactAvatar
                        contact={selectedContact}
                        className="h-16 w-16 rounded-[22px] text-base"
                      />
                      <span
                        className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-white ${
                          selectedContact.isOnline ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                          {getDisplayName(selectedContact)}
                        </h2>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            selectedContact.isOnline
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {selectedContact.isOnline ? "En linea" : "Desconectado"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {ROLE_LABELS[selectedContact.role]}
                        {selectedContact.specialty ? ` - ${selectedContact.specialty}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:w-auto">
                    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mensajes</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{messages.length}</p>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Estado</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {selectedContact.isOnline ? "Disponible" : "Sin actividad"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.12),transparent_26%),linear-gradient(180deg,#fcfcfd_0%,#f8fafc_100%)] px-5 py-5">
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
                          Aun no hay mensajes con este usuario.
                        </div>
                      )}

                      {messages.map((message, index) => {
                        const own = message.senderId === currentUserId;
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
                                  {formatMessageDayLabel(message.createdAt)}
                                </span>
                                <div className="h-px flex-1 bg-slate-200" />
                              </div>
                            )}

                            <div
                              className={`flex items-end gap-3 ${own ? "justify-end" : "justify-start"}`}
                            >
                              {!own && (
                                <ContactAvatar
                                  contact={selectedContact}
                                  className="h-10 w-10 rounded-[16px] text-xs"
                                />
                              )}

                              <div
                                className={`max-w-[78%] rounded-[26px] px-4 py-3 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.35)] ${
                                  own
                                    ? "bg-[linear-gradient(135deg,#0f172a,#334155)] text-white"
                                    : "border border-white/80 bg-white text-slate-700"
                                }`}
                              >
                                <p className="text-sm leading-6">{message.text}</p>
                                <p
                                  className={`mt-2 text-[11px] ${
                                    own ? "text-slate-300" : "text-slate-400"
                                  }`}
                                >
                                  {formatMessageTime(message.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  <div className="shrink-0 rounded-[30px] border border-white/80 bg-white/90 p-3 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.35)] backdrop-blur">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end">
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        rows={3}
                        placeholder={`Escribe un mensaje para ${selectedContact.firstName || "este contacto"}`}
                        className="min-h-[96px] flex-1 resize-none rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={sending || !draft.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <SendIcon />
                        {sending ? "Enviando..." : "Enviar"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[72vh] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.14),transparent_30%),linear-gradient(180deg,#ffffff,#f8fafc)] px-6 text-center">
              <div className="max-w-md rounded-[32px] border border-dashed border-slate-200 bg-white/90 px-8 py-10 shadow-sm">
                <p className="text-lg font-semibold text-slate-900">Selecciona un contacto</p>
                <p className="mt-2 text-sm text-slate-500">
                  El panel central mostrara la conversacion cuando elijas un usuario de la sede.
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_30px_80px_-45px_rgba(15,23,42,0.45)]">
          {selectedContact ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Perfil</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    {getDisplayName(selectedContact)}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedContact.isOnline ? "Disponible ahora" : "Sin actividad reciente"}
                  </p>
                </div>
                <ContactAvatar
                  contact={selectedContact}
                  className="h-16 w-16 rounded-[22px] text-base"
                />
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Nombre</p>
                  <p className="mt-3 text-sm font-medium text-slate-900">
                    {getDisplayName(selectedContact)}
                  </p>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Correo</p>
                  <p className="mt-3 break-words text-sm font-medium text-slate-900">
                    {selectedContact.email}
                  </p>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Rol</p>
                  <p className="mt-3 text-sm font-medium text-slate-900">
                    {ROLE_LABELS[selectedContact.role]}
                  </p>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Especialidad</p>
                  <p className="mt-3 text-sm font-medium text-slate-900">
                    {selectedContact.specialty || "No registrada"}
                  </p>
                </div>

              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div className="max-w-xs">
                <p className="text-base font-semibold text-slate-900">Sin perfil activo</p>
                <p className="mt-2 text-sm text-slate-500">
                  Al seleccionar un contacto veras aqui sus datos y el resumen de la conversacion.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
