import type { Chat } from '../../../chats/types';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: фиксирует изменение чата и отправляет событие обновления.
 * Зачем нужно: все локальные мутации должны одинаково обновлять updatedAt и webview listeners.
 * Какую продуктовую проблему решает: UI не пропускает изменения статуса, сообщений или настроек чата.
 */
export function touchChat({ state, chat }: { state: DaemonChatStoreState; chat: Chat }): void {
  chat.updatedAt = Date.now();
  state.changedEmitter.fire();
}
