import { writeJsonAtomic } from '../../storage/storage';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import type { StoredChatMeta } from './StoredChatMeta';
import { getChatMetaPath } from './getChatMetaPath';
import { normalizeMeta } from './normalizeMeta';

/**
 * Что это: atomic-запись meta.json чата.
 * Зачем нужно: все сценарии сохраняют метаданные через одну нормализацию.
 * Какую продуктовую проблему решает: карточка чата не расходится между update/create/append.
 */
export function writeChatMeta({
  context,
  meta
}: {
  context: ChatRepositoryContext;
  meta: StoredChatMeta;
}): Promise<void> {
  return writeJsonAtomic(getChatMetaPath({ context, chatId: meta.id }), normalizeMeta({ meta }));
}
