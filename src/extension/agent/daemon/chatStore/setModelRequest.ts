import type { Chat } from '../../../chats/types';
import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: заменяет полный статус model request.
 * Зачем нужно: streaming lifecycle публикует phase/timing/token статус модели.
 * Какую продуктовую проблему решает: UI показывает прогресс запроса к модели без анализа raw-событий.
 */
export function setModelRequest({
  state,
  chatId,
  modelRequest
}: {
  state: DaemonChatStoreState;
  chatId: string;
  modelRequest: Chat['modelRequest'];
}): void {
  const chat = requireChat({ state, chatId });
  chat.modelRequest = modelRequest;
  touchChat({ state, chat });
}
