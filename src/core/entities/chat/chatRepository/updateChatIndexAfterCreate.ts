import { readJsonFile } from '../../../shared/lib/fileRepository';
import type { Chat } from '../../../shared/types/types';
import { safeMkdir, writeJsonAtomic } from '../../storage/storage';
import { CHAT_SCHEMA_VERSION } from './CHAT_SCHEMA_VERSION';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import type { StoredChatIndex } from './StoredChatIndex';
import { getChatIndexPath } from './getChatIndexPath';
import { sortSummaries } from './sortSummaries';
import { toSummary } from './toSummary';

/**
 * Что это: быстро добавляет созданный чат в persisted index.json без полного rebuild.
 * Зачем нужно: создание пустого чата должно быть быстрым и не читать историю всех соседних чатов.
 * Какую продуктовую проблему решает: кнопка «Новый чат» получает latency, близкую к одной FS-записи.
 */
export async function updateChatIndexAfterCreate({
  context,
  chat
}: {
  context: ChatRepositoryContext;
  chat: Chat;
}): Promise<void> {
  const indexPath = getChatIndexPath({ context });
  const currentIndex = await readExistingIndex({ indexPath });
  const summaries = currentIndex?.chats.filter((summary) => summary.id !== chat.id) || [];

  summaries.push(toSummary({ chat }));
  await safeMkdir(context.rootPath);
  await writeJsonAtomic(indexPath, {
    schemaVersion: CHAT_SCHEMA_VERSION,
    updatedAt: context.now(),
    chats: sortSummaries({ summaries })
  } satisfies StoredChatIndex);
}

/**
 * Что это: читает существующий index.json как cache best-effort.
 * Зачем нужно: повреждённый index не должен ломать создание чата; полный rebuild восстановит его при следующем list.
 * Какую продуктовую проблему решает: пользователь может создать новый чат даже после ручной порчи index-файла.
 */
async function readExistingIndex({ indexPath }: { indexPath: string }): Promise<StoredChatIndex | undefined> {
  try {
    const index = await readJsonFile<StoredChatIndex>(indexPath);
    return index?.schemaVersion === CHAT_SCHEMA_VERSION && Array.isArray(index.chats) ? index : undefined;
  } catch {
    return undefined;
  }
}
