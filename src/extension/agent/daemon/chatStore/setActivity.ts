import type { Chat } from '../../../chats/types';
import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: обновляет activity и detail локального чата.
 * Зачем нужно: статусная строка должна различать thinking/runningTool/waiting approval.
 * Какую продуктовую проблему решает: пользователь понимает, что агент делает прямо сейчас.
 */
export function setActivity({
  state,
  chatId,
  activity,
  detail
}: {
  state: DaemonChatStoreState;
  chatId: string;
  activity: Chat['activity'];
  detail?: string;
}): void {
  const chat = requireChat({ state, chatId });
  chat.activity = activity;
  chat.activityDetail = detail;
  touchChat({ state, chat });
}
