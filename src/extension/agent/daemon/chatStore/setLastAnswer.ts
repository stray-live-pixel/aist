import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: обновляет последний ответ ассистента в локальном чате.
 * Зачем нужно: summary/header могут показывать lastAnswer без просмотра всех сообщений.
 * Какую продуктовую проблему решает: UI быстро обновляет краткое состояние диалога после ответа агента.
 */
export function setLastAnswer({
  state,
  chatId,
  answer
}: {
  state: DaemonChatStoreState;
  chatId: string;
  answer: string;
}): void {
  const chat = requireChat({ state, chatId });
  chat.lastAnswer = answer;
  touchChat({ state, chat });
}
