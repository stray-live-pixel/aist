import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: обновляет busy-флаг локального чата.
 * Зачем нужно: webview должен мгновенно блокировать/разблокировать действия во время выполнения агента.
 * Какую продуктовую проблему решает: пользователь не отправляет конфликтующие команды в занятый чат.
 */
export function setBusy({ state, chatId, busy }: { state: DaemonChatStoreState; chatId: string; busy: boolean }): void {
  const chat = requireChat({ state, chatId });
  chat.busy = busy;
  touchChat({ state, chat });
}
