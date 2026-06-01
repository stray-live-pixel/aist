import path from 'node:path';

import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { getChatPath } from './getChatPath';

/**
 * Что это: путь к state.json конкретного чата.
 * Зачем нужно: runtime-состояние хранится отдельно от meta и сообщений.
 * Какую продуктовую проблему решает: busy/activity можно сбрасывать без риска стереть историю пользователя.
 */
export function getChatStatePath({ context, chatId }: { context: ChatRepositoryContext; chatId: string }): string {
  return path.join(getChatPath({ context, chatId }), 'state.json');
}
