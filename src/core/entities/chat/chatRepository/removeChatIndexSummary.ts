import { safeMkdir, writeJsonAtomic } from '../../storage/storage';
import { CHAT_SCHEMA_VERSION } from './CHAT_SCHEMA_VERSION';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import type { StoredChatIndex } from './StoredChatIndex';
import { getChatIndexPath } from './getChatIndexPath';
import { readExistingChatIndex } from './readExistingChatIndex';
import { rebuildChatIndex } from './rebuildChatIndex';
import { sortSummaries } from './sortSummaries';

/**
 * Что это: точечно удаляет summary чата из index.json.
 * Зачем нужно: delete знает chatId и не должен пересобирать summaries всех оставшихся чатов.
 * Какую продуктовую проблему решает: удаление одного диалога не создаёт лишнюю нагрузку на файловое хранилище.
 */
export async function removeChatIndexSummary({
  context,
  chatId
}: {
  context: ChatRepositoryContext;
  chatId: string;
}): Promise<void> {
  const index = await readExistingChatIndex({ indexPath: getChatIndexPath({ context }) });
  if (!index) {
    await rebuildChatIndex({ context });
    return;
  }

  await safeMkdir(context.rootPath);
  await writeJsonAtomic(getChatIndexPath({ context }), {
    schemaVersion: CHAT_SCHEMA_VERSION,
    updatedAt: context.now(),
    chats: sortSummaries({ summaries: index.chats.filter((summary) => summary.id !== chatId) })
  } satisfies StoredChatIndex);
}
