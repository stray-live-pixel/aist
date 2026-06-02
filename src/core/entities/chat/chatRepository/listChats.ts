import { pathExists } from '../../../shared/lib/fileRepository';
import type { ChatSummary } from '../../../shared/types/types';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { readUsableChatIndex } from './readUsableChatIndex';
import { rebuildChatIndex } from './rebuildChatIndex';
import { sortSummaries } from './sortSummaries';

/**
 * Что это: чтение списка чатов из индекса или rebuild fallback.
 * Зачем нужно: обычный UI-путь быстрый, но повреждённый индекс не критичен.
 * Какую продуктовую проблему решает: пользователь всегда видит список своих чатов, даже если кеш сломан.
 */
export async function listChats({ context }: { context: ChatRepositoryContext }): Promise<ChatSummary[]> {
  if (!(await pathExists(context.rootPath))) {
    return [];
  }

  const index = await readUsableChatIndex({ context });
  return index ? sortSummaries({ summaries: index.chats }) : rebuildChatIndex({ context });
}
