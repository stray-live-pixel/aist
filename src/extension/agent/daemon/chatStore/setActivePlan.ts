import type { Chat } from '../../../chats/types';
import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: обновляет активный план агента.
 * Зачем нужно: виджет плана должен получать прогресс шагов отдельно от сообщений.
 * Какую продуктовую проблему решает: пользователь видит, на каком этапе находится агент.
 */
export function setActivePlan({
  state,
  chatId,
  activePlan
}: {
  state: DaemonChatStoreState;
  chatId: string;
  activePlan: Chat['activePlan'];
}): void {
  const chat = requireChat({ state, chatId });
  chat.activePlan = activePlan;
  touchChat({ state, chat });
}
