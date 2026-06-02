import type { Chat } from '../../../shared/types/types';
import { safeMkdir, writeJsonAtomic } from '../../storage/storage';
import { CHAT_SCHEMA_VERSION } from './CHAT_SCHEMA_VERSION';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import type { StoredChatIndex } from './StoredChatIndex';
import { getChat } from './getChat';
import { getChatIndexPath } from './getChatIndexPath';
import { listChatIds } from './listChatIds';
import { sortSummaries } from './sortSummaries';
import { toSummary } from './toSummary';

/**
 * Что это: полная пересборка индекса чатов из директорий workspace.
 * Зачем нужно: index.json является кешем, а не единственным источником истории.
 * Какую продуктовую проблему решает: пользовательские чаты восстанавливаются после повреждения или удаления index.json.
 */
export async function rebuildChatIndex({ context }: { context: ChatRepositoryContext }) {
  const chatIds = await listChatIds({ context });
  const chats: Chat[] = [];

  for (const chatId of chatIds) {
    const chat = await getChat({ context, chatId });
    if (chat) {
      chats.push(chat);
    }
  }

  const summaries = sortSummaries({ summaries: chats.map((chat) => toSummary({ chat })) });
  await safeMkdir(context.rootPath);
  await writeJsonAtomic(getChatIndexPath({ context }), {
    schemaVersion: CHAT_SCHEMA_VERSION,
    updatedAt: context.now(),
    chats: summaries
  } satisfies StoredChatIndex);

  return summaries;
}
