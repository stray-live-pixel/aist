import { writeJsonAtomic } from '../../storage/storage';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import type { StoredChatState } from './StoredChatState';
import { getChatStatePath } from './getChatStatePath';

/**
 * Что это: atomic-запись state.json чата.
 * Зачем нужно: runtime status должен сохраняться без частичных JSON-файлов.
 * Какую продуктовую проблему решает: webview не падает на refresh из-за недописанного state.
 */
export function writeChatState({
  context,
  chatId,
  state
}: {
  context: ChatRepositoryContext;
  chatId: string;
  state: StoredChatState;
}): Promise<void> {
  return writeJsonAtomic(getChatStatePath({ context, chatId }), state);
}
