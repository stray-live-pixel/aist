import type { DaemonChat } from '../../../../cli/daemonProtocol';
import { getSortedChats } from './getSortedChats';
import { toExtensionChat } from './toExtensionChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: полная замена локального store снимком из daemon.
 * Зачем нужно: daemon является source of truth, но extension сохраняет локальные vcs-patches до следующего payload.
 * Какую продуктовую проблему решает: webview быстро синхронизируется после reconnect без потери активного чата.
 */
export function replaceAllChats({
  state,
  chats,
  activeChatId
}: {
  state: DaemonChatStoreState;
  chats: readonly DaemonChat[];
  activeChatId?: string;
}): void {
  const previousVcs = new Map([...state.chats.values()].map((chat) => [chat.id, chat.vcs]));
  state.chats.clear();

  for (const chat of chats) {
    state.chats.set(chat.id, toExtensionChat({ chat, fallbackVcs: previousVcs.get(chat.id) }));
  }

  if (activeChatId && state.chats.has(activeChatId)) {
    state.activeChatId = activeChatId;
  } else if (!state.activeChatId || !state.chats.has(state.activeChatId)) {
    state.activeChatId = getSortedChats({ state })[0]?.id;
  }

  state.changedEmitter.fire();
}
