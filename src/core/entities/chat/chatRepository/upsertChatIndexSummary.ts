import type { Chat } from '../../../shared/types/types';
import { safeMkdir, writeJsonAtomic } from '../../storage/storage';
import { CHAT_SCHEMA_VERSION } from './CHAT_SCHEMA_VERSION';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import type { StoredChatIndex } from './StoredChatIndex';
import { getChatIndexPath } from './getChatIndexPath';
import { readExistingChatIndex } from './readExistingChatIndex';
import { rebuildChatIndex } from './rebuildChatIndex';
import { sortSummaries } from './sortSummaries';
import { toSummary } from './toSummary';

/**
 * Что это: точечно обновляет summary одного чата в index.json.
 * Зачем нужно: изменение одного диалога не должно перечитывать все чаты и всю историю.
 * Какую продуктовую проблему решает: список чатов остаётся быстрым при append/update/clear активного агента.
 */
export async function upsertChatIndexSummary({
  context,
  chat
}: {
  context: ChatRepositoryContext;
  chat: Chat;
}): Promise<void> {
  const index = await readExistingChatIndex({ indexPath: getChatIndexPath({ context }) });
  if (!index) {
    await rebuildChatIndex({ context });
    return;
  }

  const summaries = index.chats.filter((summary) => summary.id !== chat.id);
  summaries.push(toSummary({ chat }));

  await safeMkdir(context.rootPath);
  await writeJsonAtomic(getChatIndexPath({ context }), {
    schemaVersion: CHAT_SCHEMA_VERSION,
    updatedAt: context.now(),
    chats: sortSummaries({ summaries })
  } satisfies StoredChatIndex);
}
