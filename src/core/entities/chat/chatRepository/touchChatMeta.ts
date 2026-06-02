import type { ChatRepositoryContext } from './ChatRepositoryContext';
import type { StoredChatMeta } from './StoredChatMeta';
import { writeChatMeta } from './writeChatMeta';

/**
 * Что это: обновление updatedAt без изменения остальных метаданных.
 * Зачем нужно: append/history/state должны поднимать чат в списке без ручного копирования meta-логики.
 * Какую продуктовую проблему решает: актуальные чаты остаются наверху истории после фоновых изменений.
 */
export function touchChatMeta({
  context,
  meta
}: {
  context: ChatRepositoryContext;
  meta: StoredChatMeta;
}): Promise<void> {
  return writeChatMeta({ context, meta: { ...meta, updatedAt: context.now() } });
}
