import type { Chat } from '../../../chats/types';
import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: заменяет model history локального чата.
 * Зачем нужно: compaction/runtime обновляет историю модели отдельно от видимых сообщений.
 * Какую продуктовую проблему решает: следующий запрос получает правильный компактный контекст.
 */
export function setHistory({
  state,
  chatId,
  history
}: {
  state: DaemonChatStoreState;
  chatId: string;
  history: Chat['history'];
}): void {
  const chat = requireChat({ state, chatId });
  chat.history = history;
  touchChat({ state, chat });
}
