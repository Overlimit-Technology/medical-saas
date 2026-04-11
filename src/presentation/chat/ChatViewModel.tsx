"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatRepositoryHttp } from "@/data/chat/ChatRepository";
import type { ChatMessage, Contact, ContactRole } from "@/domain/chat/entities/Chat";
import {
  GetChatContactsUseCase,
  GetChatMessagesUseCase,
  SendChatMessageUseCase,
  UploadChatAttachmentUseCase,
} from "@/domain/chat/usecases/ChatUseCases";

export type { ChatMessage, Contact, ContactRole };

export const ROLE_LABELS: Record<ContactRole, string> = {
  ADMIN: "Administrador",
  DOCTOR: "Doctor",
  SECRETARY: "Secretaria",
};

export function getDisplayName(contact: Contact) {
  const fullName = `${contact.firstName} ${contact.lastName}`.trim();
  return fullName || contact.email;
}

export function getContactSubtitle(contact: Contact) {
  const roleLabel = ROLE_LABELS[contact.role];
  return contact.specialty ? `${roleLabel} · ${contact.specialty}` : roleLabel;
}

export function getInitials(contact: Contact) {
  const seed = `${contact.firstName} ${contact.lastName}`.trim() || contact.email;
  return seed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageType(mimeType?: string) {
  return mimeType?.startsWith("image/") ?? false;
}

export function formatMessageTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatMessageDayLabel(value: string) {
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

export function useChatViewModel() {
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

  const { getChatContactsUseCase, getChatMessagesUseCase, uploadChatAttachmentUseCase, sendChatMessageUseCase } =
    useMemo(() => {
      const repo = new ChatRepositoryHttp();
      return {
        getChatContactsUseCase: new GetChatContactsUseCase(repo),
        getChatMessagesUseCase: new GetChatMessagesUseCase(repo),
        uploadChatAttachmentUseCase: new UploadChatAttachmentUseCase(repo),
        sendChatMessageUseCase: new SendChatMessageUseCase(repo),
      };
    }, []);

  const loadContacts = useCallback(
    async (showLoader = false) => {
      if (showLoader) setLoading(true);
      try {
        const result = await getChatContactsUseCase.execute();
        setContacts(result.contacts);
        setClinicLabel(result.clinicLabel);
        setSelectedId((current) => {
          if (current && result.contacts.some((contact) => contact.id === current)) {
            return current;
          }
          return result.contacts[0]?.id ?? null;
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los contactos.");
        setContacts([]);
        setSelectedId(null);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [getChatContactsUseCase]
  );

  const loadMessages = useCallback(
    async (contactId: string, showLoader = false) => {
      if (!contactId) {
        setMessages([]);
        return;
      }
      if (showLoader) setMessagesLoading(true);
      try {
        const result = await getChatMessagesUseCase.execute(contactId);
        setCurrentUserId(result.currentUserId);
        setMessages(result.messages);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los mensajes.");
        setMessages([]);
      } finally {
        if (showLoader) setMessagesLoading(false);
      }
    },
    [getChatMessagesUseCase]
  );

  useEffect(() => {
    setError(null);
    void loadContacts(true);
  }, [loadContacts]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    setError(null);
    void loadMessages(selectedId, true);
  }, [loadMessages, selectedId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadContacts(false);
      if (selectedId) void loadMessages(selectedId, false);
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [loadContacts, loadMessages, selectedId]);

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
      setFilePreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return URL.createObjectURL(file);
      });
      return;
    }
    setFilePreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  }, []);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
    setFilePreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current += 1;
    if (event.dataTransfer.types.includes("Files")) setDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dragCounterRef.current = 0;
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onlineCount = contacts.filter((contact) => contact.isOnline).length;

  const handleSendMessage = async () => {
    if (!selectedContact) return;
    const text = draft.trim();
    if (!text && !selectedFile) return;

    setSending(true);
    setError(null);
    try {
      const attachment = selectedFile
        ? await uploadChatAttachmentUseCase.execute(selectedFile)
        : undefined;

      const message = await sendChatMessageUseCase.execute({
        recipientId: selectedContact.id,
        text,
        attachment,
      });

      setMessages((current) => [...current, message]);
      setDraft("");
      clearSelectedFile();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  };

  return {
    state: {
      contacts,
      filteredContacts,
      selectedContact,
      search,
      clinicLabel,
      loading,
      messagesLoading,
      sending,
      error,
      messages,
      currentUserId,
      draft,
      selectedFile,
      filePreviewUrl,
      dragging,
      onlineCount,
    },
    actions: {
      setSelectedId,
      setSearch,
      setDraft,
      handleSendMessage,
      handleFileSelect,
      clearSelectedFile,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
    },
    refs: {
      fileInputRef,
      messagesEndRef,
    },
  };
}
