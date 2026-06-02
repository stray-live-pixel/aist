import { ChatRepository } from '../../core/entities/chat/chatRepository';
import { type Chat } from '../../core/shared/types/types';
import { CliCommandError } from './CliCommandError';

export async function requireChat(repository: ChatRepository, chatId: string): Promise<Chat> {
  const chat = await repository.get(chatId);
  if (!chat) {
    throw new CliCommandError('chat.notFound', `Chat not found: ${chatId}`, { details: { chatId } });
  }

  return chat;
}
