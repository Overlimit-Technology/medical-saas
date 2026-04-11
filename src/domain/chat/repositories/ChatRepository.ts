import type {
  ChatAttachment,
  ChatContactsResult,
  ChatMessage,
  ChatMessagesResult,
} from "../entities/Chat";

export interface ChatRepository {
  getContacts(): Promise<ChatContactsResult>;
  getMessages(contactId: string): Promise<ChatMessagesResult>;
  uploadAttachment(file: File): Promise<ChatAttachment>;
  sendMessage(input: {
    recipientId: string;
    text: string;
    attachment?: ChatAttachment;
  }): Promise<ChatMessage>;
}
