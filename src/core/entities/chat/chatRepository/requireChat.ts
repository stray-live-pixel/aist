import { FileRepositoryError } from '../../../shared/lib/fileRepository';
import type { Chat } from '../../../shared/types/types';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { getChat } from './getChat';

/**
 * Что это: чтение обязательного полного чата.
 * Зачем нужно: update-сценарии должны завершаться явной ошибкой, если chat id больше не существует.
 * Какую продуктовую проблему решает: клиент не получает успешный ответ на действие, которое не было применено.
 */
export async function requireChat({
  context,
  chatId
}: {
  context: ChatRepositoryContext;
  chatId: string;
}): Promise<Chat> {
  const chat = await getChat({ context, chatId });
  if (!chat) {
    throw new FileRepositoryError('repository.readFailed', `Chat not found: ${chatId}`, { id: chatId });
  }

  return chat;
}
