import type { Chat } from '../../../chats/types';
import { DEFAULT_MODEL } from '../../../shared/constants';
import { createLocalChat } from './createLocalChat';
import { getActiveChat } from './getActiveChat';
import { getSortedChats } from './getSortedChats';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: удаляет чат из локального daemon-store и выбирает fallback active chat.
 * Зачем нужно: UI должен сразу убрать чат из списка, даже если persisted-delete выполняется отдельно.
 * Какую продуктовую проблему решает: после delete пользователь не остаётся на пустой ссылке активного чата.
 */
export function deleteLocalChat({
  state,
  chatId,
  fallbackModel = DEFAULT_MODEL
}: {
  state: DaemonChatStoreState;
  chatId: string;
  fallbackModel?: string;
}): Chat {
  state.chats.delete(chatId);

  if (!state.chats.size) {
    return createLocalChat({ state, settings: fallbackModel });
  }

  if (state.activeChatId === chatId || !state.activeChatId || !state.chats.has(state.activeChatId)) {
    state.activeChatId = getSortedChats({ state })[0].id;
  }

  state.changedEmitter.fire();
  return getActiveChat({ state });
}
