import type { Chat } from '../../../chats/types';
import { createLocalChat } from './createLocalChat';
import { getSortedChats } from './getSortedChats';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: возвращает активный чат с fallback-созданием пустого чата.
 * Зачем нужно: webview всегда должен иметь диалог для отображения composer и messages area.
 * Какую продуктовую проблему решает: пустое состояние daemon не ломает пользовательский экран чата.
 */
export function getActiveChat({ state }: { state: DaemonChatStoreState }): Chat {
  if (!state.activeChatId || !state.chats.has(state.activeChatId)) {
    const first = getSortedChats({ state })[0];
    if (first) {
      state.activeChatId = first.id;
      return first;
    }

    return createLocalChat({ state });
  }

  return state.chats.get(state.activeChatId)!;
}
