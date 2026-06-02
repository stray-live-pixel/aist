import { FileRepositoryError, readJsonFile } from '../../../shared/lib/fileRepository';
import { CHAT_SCHEMA_VERSION } from './CHAT_SCHEMA_VERSION';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import type { StoredChatIndex } from './StoredChatIndex';
import { getChatIndexPath } from './getChatIndexPath';
import { listChatIds } from './listChatIds';

/**
 * Что это: чтение index.json только если он соответствует фактическим чатам.
 * Зачем нужно: быстрый путь list не должен скрывать новые/удалённые директории.
 * Какую продуктовую проблему решает: история чатов остаётся полной даже после ручных изменений файлов.
 */
export async function readUsableChatIndex({
  context
}: {
  context: ChatRepositoryContext;
}): Promise<StoredChatIndex | undefined> {
  let index: StoredChatIndex | undefined;

  try {
    index = await readJsonFile<StoredChatIndex>(getChatIndexPath({ context }));
  } catch (error) {
    if (error instanceof FileRepositoryError && error.code === 'repository.invalidJson') {
      return undefined;
    }

    throw error;
  }

  if (!index || index.schemaVersion !== CHAT_SCHEMA_VERSION || !Array.isArray(index.chats)) {
    return undefined;
  }

  const indexIds = new Set(index.chats.map((chat) => chat.id));
  const sourceIds = await listChatIds({ context });
  return indexIds.size === sourceIds.length && sourceIds.every((chatId) => indexIds.has(chatId)) ? index : undefined;
}
