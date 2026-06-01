import fs from 'node:fs';

import { assertRepositoryId } from '../../../shared/lib/fileRepository';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { getChatPath } from './getChatPath';
import { rebuildChatIndex } from './rebuildChatIndex';

/**
 * Что это: удаление файлов чата и обновление индекса.
 * Зачем нужно: команда delete должна полностью убрать чат из хранилища workspace.
 * Какую продуктовую проблему решает: пользователь не видит удалённый диалог после refresh/restart.
 */
export async function deleteChat({
  context,
  chatId
}: {
  context: ChatRepositoryContext;
  chatId: string;
}): Promise<void> {
  const safeChatId = assertRepositoryId(chatId, 'chat');
  await fs.promises.rm(getChatPath({ context, chatId: safeChatId }), { recursive: true, force: true });
  await rebuildChatIndex({ context });
}
