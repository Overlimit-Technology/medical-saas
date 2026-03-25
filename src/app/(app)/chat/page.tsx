"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number;
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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(mimeType?: string) {
  return mimeType?.startsWith("image/") ?? false;
}

function PaperclipIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 008.486 8.486L20.5 13" />
    </svg>
  );
}

function FileIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function ContactAvatar({
  contact,
  selected = false,
  className = "h-12 w-12 rounded-2xl text-sm",
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
        selected ? "bg-white/15 text-white" : "bg-sky-100 text-sky-700"
      } ${className}`}
    >
      {getInitials(contact)}
    </div>
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  const processFile = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError("El archivo excede el limite de 10MB.");
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      setFilePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    } else {
      setFilePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
    setFilePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const uploadToCloudinary = async (file: File) => {
    const sigRes = await fetch("/api/chat/upload-signature", {
      method: "POST",
      credentials: "include",
    });
    const sigData = await sigRes.json();

    if (!sigData.ok) {
      throw new Error(sigData.error ?? "No se pudo obtener firma de subida.");
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

    if (!uploadRes.ok) {
      throw new Error("Error al subir el archivo.");
    }

    const uploadData = await uploadRes.json();

    return {
      url: uploadData.secure_url as string,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    };
  };

  const handleSendMessage = async () => {
    if (!selectedContact) return;

    const text = draft.trim();
    if (!text && !selectedFile) return;

    setSending(true);
    setError(null);

    try {
      let attachment: {
        url: string;
        fileName: string;
        fileType: string;
        fileSize: number;
      } | undefined;

      if (selectedFile) {
        attachment = await uploadToCloudinary(selectedFile);
      }

      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          recipientId: selectedContact.id,
          text,
          attachment,
        }),
      });
      const data = (await res.json()) as MessagesPayload;

      if (!data.ok || !data.item) {
        setError(data.error ?? "No se pudo enviar el mensaje.");
        return;
      }

      setMessages((current) => [...current, data.item as ChatMessage]);
      setDraft("");
      clearSelectedFile();
    } catch {
      setError("No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Comunicacion interna</p>
        <h1 className="text-2xl font-semibold text-slate-900">Chat en tiempo real</h1>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid h-[calc(100vh-9rem)] min-h-[640px] grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-950 px-5 py-5 text-white">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">Contactos</p>
            <p className="mt-2 text-lg font-semibold">Usuarios de la sede</p>
            <p className="mt-1 text-sm text-slate-300">{clinicLabel}</p>
          </div>

          <div className="border-b border-slate-100 px-4 py-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, correo o rol"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="animate-pulse rounded-2xl border border-slate-100 px-4 py-4"
                  >
                    <div className="h-4 w-32 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            )}

            {!loading && filteredContacts.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
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
                    className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                      selected
                        ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                        : "border-slate-100 bg-white text-slate-900 hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ContactAvatar contact={contact} selected={selected} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold">
                            {getDisplayName(contact)}
                          </p>
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              contact.isOnline
                                ? selected
                                  ? "bg-emerald-300"
                                  : "bg-emerald-500"
                                : selected
                                  ? "bg-slate-400"
                                  : "bg-slate-300"
                            }`}
                          />
                        </div>
                        <p
                          className={`mt-1 truncate text-xs ${
                            selected ? "text-slate-200" : "text-slate-500"
                          }`}
                        >
                          {ROLE_LABELS[contact.role]}
                          {contact.specialty ? ` - ${contact.specialty}` : ""}
                        </p>
                        <p
                          className={`mt-1 truncate text-xs ${
                            selected ? "text-slate-300" : "text-slate-400"
                          }`}
                        >
                          {contact.email}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className="relative flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm"
          onDragEnter={selectedContact ? handleDragEnter : undefined}
          onDragLeave={selectedContact ? handleDragLeave : undefined}
          onDragOver={selectedContact ? handleDragOver : undefined}
          onDrop={selectedContact ? handleDrop : undefined}
        >
          {dragging && selectedContact && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[32px] border-2 border-dashed border-sky-400 bg-sky-50/90 backdrop-blur-sm">
              <div className="text-center">
                <PaperclipIcon className="mx-auto h-10 w-10 text-sky-500" />
                <p className="mt-3 text-base font-semibold text-sky-700">Suelta el archivo aqui</p>
                <p className="mt-1 text-sm text-sky-500">Imagenes, PDFs, documentos (max 10MB)</p>
              </div>
            </div>
          )}
          {selectedContact ? (
            <>
              <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_40%),linear-gradient(135deg,#ffffff,#eff6ff)] px-6 py-5">
                <div className="flex items-center gap-4">
                  <ContactAvatar
                    contact={selectedContact}
                    className="h-14 w-14 rounded-[20px] text-base"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">
                        {getDisplayName(selectedContact)}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
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
              </div>

              <div className="min-h-0 flex-1 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_28%)] px-6 py-6">
                <div className="mx-auto flex h-full min-h-0 max-w-3xl flex-col gap-6">
                  <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    <div className="space-y-4">
                      {messagesLoading && (
                        <div className="rounded-3xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                          Cargando mensajes...
                        </div>
                      )}

                      {!messagesLoading && messages.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">
                          Aun no hay mensajes con este usuario.
                        </div>
                      )}

                      {messages.map((message) => {
                        const own = message.senderId === currentUserId;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${own ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[78%] rounded-[24px] px-4 py-3 shadow-sm ${
                                own
                                  ? "bg-slate-900 text-white"
                                  : "border border-slate-200 bg-white text-slate-700"
                              }`}
                            >
                              {message.attachmentUrl && isImageType(message.attachmentType) && (
                                <a href={message.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={message.attachmentUrl}
                                    alt={message.attachmentName ?? "imagen"}
                                    className="mb-2 max-h-64 rounded-xl object-contain"
                                  />
                                </a>
                              )}

                              {message.attachmentUrl && !isImageType(message.attachmentType) && (
                                <a
                                  href={message.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                                    own
                                      ? "bg-white/10 hover:bg-white/20"
                                      : "bg-slate-50 hover:bg-slate-100"
                                  }`}
                                >
                                  <FileIcon className="h-5 w-5 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{message.attachmentName}</p>
                                    {message.attachmentSize != null && (
                                      <p className={`text-xs ${own ? "text-slate-300" : "text-slate-400"}`}>
                                        {formatFileSize(message.attachmentSize)}
                                      </p>
                                    )}
                                  </div>
                                </a>
                              )}

                              {message.text && (
                                <p className="text-sm leading-6">{message.text}</p>
                              )}
                              <p
                                className={`mt-2 text-[11px] ${
                                  own ? "text-slate-300" : "text-slate-400"
                                }`}
                              >
                                {formatMessageTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
                    {selectedFile && (
                      <div className="mb-3 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                        {filePreviewUrl ? (
                          <img
                            src={filePreviewUrl}
                            alt="preview"
                            className="h-16 w-16 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-200">
                            <FileIcon className="h-6 w-6 text-slate-500" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-700">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={clearSelectedFile}
                          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <div className="flex flex-col gap-3 md:flex-row md:items-end">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sending}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Adjuntar archivo"
                      >
                        <PaperclipIcon />
                      </button>
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        rows={3}
                        placeholder={`Escribe un mensaje para ${selectedContact.firstName || "este contacto"}`}
                        className="min-h-[92px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={sending || (!draft.trim() && !selectedFile)}
                        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {sending ? "Enviando..." : "Enviar"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[72vh] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_42%),linear-gradient(180deg,#ffffff,#f8fafc)] px-6 text-center">
              <div className="max-w-md rounded-[32px] border border-dashed border-slate-200 bg-white/90 px-8 py-10 shadow-sm">
                <p className="text-lg font-semibold text-slate-900">Selecciona un contacto</p>
                <p className="mt-2 text-sm text-slate-500">
                  El panel derecho mostrara la conversacion cuando elijas un usuario de la sede.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
