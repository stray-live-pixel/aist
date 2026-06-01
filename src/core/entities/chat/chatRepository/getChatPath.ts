import { assertRepositoryId, childPath } from '../../../shared/lib/fileRepository';
import type { ChatRepositoryContext } from './ChatRepositoryContext';

/**
 * Что это: безопасный путь к директории одного чата.
 * Зачем нужно: chat id попадает в файловую систему только после проверки.
 * Какую продуктовую проблему решает: пользовательские данные нельзя записать за пределы хранилища чатов.
 */
export function getChatPath({ context, chatId }: { context: ChatRepositoryContext; chatId: string }): string {
  return childPath(context.rootPath, assertRepositoryId(chatId, 'chat'));
}
