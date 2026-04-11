import type {
  ChatAttachment,
  ChatContactsResult,
  ChatMessage,
  ChatMessagesResult,
} from "../entities/Chat";
import type { ChatRepository } from "../repositories/ChatRepository";

export class GetChatContactsUseCase {
  constructor(private readonly repo: ChatRepository) {}

  async execute(): Promise<ChatContactsResult> {
    return this.repo.getContacts();
  }
}

export class GetChatMessagesUseCase {
  constructor(private readonly repo: ChatRepository) {}

  async execute(contactId: string): Promise<ChatMessagesResult> {
    return this.repo.getMessages(contactId);
  }
}

export class UploadChatAttachmentUseCase {
  constructor(private readonly repo: ChatRepository) {}

  async execute(file: File): Promise<ChatAttachment> {
    return this.repo.uploadAttachment(file);
  }
}

export class SendChatMessageUseCase {
  constructor(private readonly repo: ChatRepository) {}

  async execute(input: {
    recipientId: string;
    text: string;
    attachment?: ChatAttachment;
  }): Promise<ChatMessage> {
    return this.repo.sendMessage(input);
  }
}
