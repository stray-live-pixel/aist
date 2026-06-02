import { assertRepositoryId, readJsonFile } from '../../../shared/lib/fileRepository';
import type { Chat } from '../../../shared/types/types';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import type { StoredChatMeta } from './StoredChatMeta';
import { getChatMetaPath } from './getChatMetaPath';
import { readChatFromMeta } from './readChatFromMeta';

/**
 * Что это: optional-чтение полного чата по id.
 * Зачем нужно: list/rebuild могут пропускать исчезнувшие записи без аварии.
 * Какую продуктовую проблему решает: удаление или повреждение одного чата не ломает всю историю.
 */
export async function getChat({
  context,
  chatId
}: {
  context: ChatRepositoryContext;
  chatId: string;
}): Promise<Chat | undefined> {
  const safeChatId = assertRepositoryId(chatId, 'chat');
  const meta = await readJsonFile<StoredChatMeta>(getChatMetaPath({ context, chatId: safeChatId }));
  return meta ? readChatFromMeta({ context, meta }) : undefined;
}
