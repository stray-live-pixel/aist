import { FileRepositoryError, assertRepositoryId, readJsonFile } from '../../../shared/lib/fileRepository';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import type { StoredChatMeta } from './StoredChatMeta';
import { getChatMetaPath } from './getChatMetaPath';
import { normalizeMeta } from './normalizeMeta';

/**
 * Что это: чтение обязательных метаданных чата.
 * Зачем нужно: mutating-сценарии должны явно падать, если чат уже удалён или id некорректен.
 * Какую продуктовую проблему решает: пользователь получает понятную ошибку вместо тихой потери обновления.
 */
export async function requireChatMeta({
  context,
  chatId
}: {
  context: ChatRepositoryContext;
  chatId: string;
}): Promise<StoredChatMeta> {
  const safeChatId = assertRepositoryId(chatId, 'chat');
  const meta = await readJsonFile<StoredChatMeta>(getChatMetaPath({ context, chatId: safeChatId }));
  if (!meta) {
    throw new FileRepositoryError('repository.readFailed', `Chat not found: ${safeChatId}`, { id: safeChatId });
  }

  return normalizeMeta({ meta });
}
