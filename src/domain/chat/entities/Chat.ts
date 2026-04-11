export type ContactRole = "ADMIN" | "DOCTOR" | "SECRETARY";

export type Contact = {
  id: string;
  email: string;
  role: ContactRole;
  image: string | null;
  firstName: string;
  lastName: string;
  specialty: string | null;
  isOnline: boolean;
};

export type ChatMessage = {
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

export type ChatAttachment = {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

export type ChatContactsResult = {
  clinicLabel: string;
  contacts: Contact[];
};

export type ChatMessagesResult = {
  currentUserId: string | null;
  messages: ChatMessage[];
};
