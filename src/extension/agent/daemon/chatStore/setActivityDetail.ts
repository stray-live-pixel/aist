import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: обновляет деталь текущей активности без смены activity.
 * Зачем нужно: long-running tools могут уточнять прогресс текстом.
 * Какую продуктовую проблему решает: пользователь получает живую обратную связь по текущему действию агента.
 */
export function setActivityDetail({
  state,
  chatId,
  detail
}: {
  state: DaemonChatStoreState;
  chatId: string;
  detail: string | undefined;
}): void {
  const chat = requireChat({ state, chatId });
  chat.activityDetail = detail;
  touchChat({ state, chat });
}
