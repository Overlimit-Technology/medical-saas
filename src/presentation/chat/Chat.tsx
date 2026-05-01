"use client";

import {
  useChatViewModel,
  getDisplayName,
  getContactSubtitle,
  getContactLastMessagePreview,
  getInitials,
  formatFileSize,
  isImageType,
  formatMessageTime,
  formatMessageDayLabel,
  formatContactActivity,
  type Contact,
} from "./ChatViewModel";

/* ── Inline SVG icons ── */

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

/* ── Main component ── */

export default function Chat() {
  const { state, actions, refs } = useChatViewModel();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {state.error && (
        <div className="mb-4 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      <div className="grid h-full min-h-0 flex-1 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_70px_-52px_rgba(15,23,42,0.45)] lg:grid-cols-[296px_minmax(0,1fr)] 2xl:grid-cols-[312px_minmax(0,1fr)]">
        {/* ── Contact list ── */}
        <section className="flex min-h-0 flex-col overflow-hidden border-r border-slate-200 bg-[linear-gradient(180deg,#ffffff,rgba(248,250,252,0.96))]">
          <div className="border-b border-slate-200 px-4 py-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">Mensajes</h1>
                <p className="mt-1 text-xs text-slate-500">
                  {state.clinicLabel} - recientes primero
                </p>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
                <span>
                  Contactos <span className="font-semibold text-slate-900">{state.contacts.length}</span>
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>
                  En linea <span className="font-semibold text-slate-900">{state.onlineCount}</span>
                </span>
              </div>
            </div>

            <label className="mt-3 flex items-center gap-2.5 rounded-[18px] border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-slate-400 transition focus-within:border-slate-300 focus-within:bg-white">
              <SearchIcon />
              <input
                value={state.search}
                onChange={(e) => actions.setSearch(e.target.value)}
                placeholder="Buscar por nombre, correo o rol"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {state.loading && (
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="animate-pulse rounded-[20px] border border-slate-100 bg-white px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-200" />
                      <div className="min-w-0 flex-1">
                        <div className="h-4 w-32 rounded bg-slate-200" />
                        <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
                        <div className="mt-2 h-3 w-40 rounded bg-slate-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!state.loading && state.filteredContacts.length === 0 && (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">Sin contactos para mostrar</p>
                <p className="mt-2 text-sm text-slate-500">
                  Cuando existan mas usuarios activos en esta sede apareceran aqui.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              {state.filteredContacts.map((contact) => {
                const selected = contact.id === state.selectedContact?.id;
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => actions.setSelectedId(contact.id)}
                    className={`w-full rounded-[20px] border px-3 py-3 text-left transition ${
                      selected
                        ? "border-slate-300 bg-slate-50 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.4)]"
                        : "border-transparent bg-transparent hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <ContactAvatar contact={contact} selected={selected} />
                        <span
                          className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                            contact.isOnline ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {getDisplayName(contact)}
                            </p>
                            <p className="mt-0.5 truncate text-[13px] text-slate-500">
                              {getContactSubtitle(contact)}
                            </p>
                          </div>
                          <span className="shrink-0 text-[11px] text-slate-400">
                            {formatContactActivity(contact.lastMessageAt, contact.isOnline)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`inline-flex h-2 w-2 rounded-full ${
                              contact.isOnline ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          />
                          <p className="truncate text-[13px] text-slate-500">
                            {getContactLastMessagePreview(contact)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Messages panel ── */}
        <section
          className="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.96))]"
          onDragEnter={state.selectedContact ? actions.handleDragEnter : undefined}
          onDragLeave={state.selectedContact ? actions.handleDragLeave : undefined}
          onDragOver={state.selectedContact ? actions.handleDragOver : undefined}
          onDrop={state.selectedContact ? actions.handleDrop : undefined}
        >
          {state.dragging && state.selectedContact && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[32px] border-2 border-dashed border-sky-400 bg-sky-50/90 backdrop-blur-sm">
              <div className="text-center">
                <PaperclipIcon className="mx-auto h-10 w-10 text-sky-500" />
                <p className="mt-3 text-base font-semibold text-sky-700">Suelta el archivo aqui</p>
                <p className="mt-1 text-sm text-sky-500">Imagenes, PDFs, documentos (max 10MB)</p>
              </div>
            </div>
          )}

          {state.selectedContact ? (
            <>
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <ContactAvatar
                      contact={state.selectedContact}
                      className="h-12 w-12 rounded-full text-sm"
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                        {getDisplayName(state.selectedContact)}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[13px] text-slate-500">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            state.selectedContact.isOnline
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {state.selectedContact.isOnline ? "En linea" : "Desconectado"}
                        </span>
                        <span>{getContactSubtitle(state.selectedContact)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3.5">
                  <div className="space-y-3.5">
                    {state.messagesLoading && (
                      <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                        Cargando mensajes...
                      </div>
                    )}

                    {!state.messagesLoading && state.messages.length === 0 && (
                      <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                        Aun no hay mensajes con este usuario.
                      </div>
                    )}

                    {state.messages.map((message, index) => {
                      const own = message.senderId === state.currentUserId;
                      const previousMessage = state.messages[index - 1];
                      const showDayDivider =
                        !previousMessage ||
                        new Date(previousMessage.createdAt).toDateString() !==
                          new Date(message.createdAt).toDateString();

                      return (
                        <div key={message.id} className="space-y-3.5">
                          {showDayDivider && (
                            <div className="flex items-center gap-3 py-2">
                              <div className="h-px flex-1 bg-slate-200" />
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                                {formatMessageDayLabel(message.createdAt)}
                              </span>
                              <div className="h-px flex-1 bg-slate-200" />
                            </div>
                          )}

                          <div className={`flex gap-3 ${own ? "justify-end" : "justify-start"}`}>
                            {!own && (
                              <div className="pt-1">
                                <ContactAvatar
                                  contact={state.selectedContact!}
                                  className="h-10 w-10 rounded-full text-xs"
                                />
                              </div>
                            )}

                            <div className={`flex max-w-[86%] flex-col ${own ? "items-end" : "items-start"}`}>
                              <div
                                className={`rounded-[22px] border px-4 py-2.5 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.35)] ${
                                  own
                                    ? "border-slate-800 bg-slate-800 text-white"
                                    : "border-slate-200 bg-white text-slate-700"
                                }`}
                              >
                                <div className="space-y-2">
                                  {message.attachmentUrl && isImageType(message.attachmentType) && (
                                    <a href={message.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={message.attachmentUrl}
                                        alt={message.attachmentName ?? "imagen"}
                                        className="max-h-64 rounded-2xl object-contain"
                                      />
                                    </a>
                                  )}

                                  {message.attachmentUrl && !isImageType(message.attachmentType) && (
                                    <a
                                      href={message.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
                                        own ? "bg-white/10 hover:bg-white/20" : "bg-slate-50 hover:bg-slate-100"
                                      }`}
                                    >
                                      <div
                                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                                          own ? "bg-white/10" : "bg-slate-200"
                                        }`}
                                      >
                                        <FileIcon className="h-5 w-5 shrink-0" />
                                      </div>
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
                                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                      {message.text}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <p className="mt-2 px-1 text-[11px] text-slate-400">
                                {formatMessageTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={refs.messagesEndRef} />
                  </div>
                </div>

                <div className="border-t border-slate-200 bg-white/90 p-2.5">
                  {state.selectedFile && (
                    <div className="mb-2.5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                      {state.filePreviewUrl ? (
                        <img
                          src={state.filePreviewUrl}
                          alt="preview"
                          className="h-14 w-14 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200">
                          <FileIcon className="h-6 w-6 text-slate-500" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-700">
                          {state.selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatFileSize(state.selectedFile.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={actions.clearSelectedFile}
                        className="rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input
                      ref={refs.fileInputRef}
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={actions.handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => refs.fileInputRef.current?.click()}
                      disabled={state.sending}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Adjuntar archivo (clic, arrastrar o pegar imagen)"
                    >
                      <PaperclipIcon />
                    </button>
                    <textarea
                      value={state.draft}
                      onChange={(e) => actions.setDraft(e.target.value)}
                      onPaste={actions.handlePaste}
                      rows={1}
                      placeholder={`Escribe un mensaje para ${state.selectedContact.firstName || "este contacto"}...`}
                      className="min-h-[56px] flex-1 resize-none rounded-[20px] border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={actions.handleSendMessage}
                      disabled={state.sending || (!state.draft.trim() && !state.selectedFile)}
                      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <SendIcon />
                      {state.sending ? "Enviando..." : "Enviar"}
                    </button>
                  </div>
                  <p className="mt-2 px-1 text-[11px] text-slate-400">
                    Arrastra, haz clic en el clip o pega una imagen con Ctrl+V.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[72vh] items-center justify-center px-6 text-center">
              <div className="max-w-md rounded-[32px] border border-dashed border-slate-200 bg-white/90 px-8 py-10 shadow-sm">
                <p className="text-lg font-semibold text-slate-900">Selecciona un contacto</p>
                <p className="mt-2 text-sm text-slate-500">
                  La conversacion aparecera aqui cuando elijas un usuario de la sede.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
