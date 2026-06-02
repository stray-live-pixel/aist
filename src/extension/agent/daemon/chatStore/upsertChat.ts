import type { DaemonChat } from '../../../../cli/daemonProtocol';
import type { Chat } from '../../../chats/types';
import { toExtensionChat } from './toExtensionChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: обновляет или добавляет один чат из daemon payload.
 * Зачем нужно: streaming-события могут приносить состояние одного чата без полного replaceAll.
 * Какую продуктовую проблему решает: webview сразу видит новые сообщения и статус активного диалога.
 */
export function upsertChat({ state, chat }: { state: DaemonChatStoreState; chat: DaemonChat }): Chat {
  const next = toExtensionChat({ chat, fallbackVcs: state.chats.get(chat.id)?.vcs });
  state.chats.set(next.id, next);

  if (!state.activeChatId) {
    state.activeChatId = next.id;
  }

  state.changedEmitter.fire();
  return next;
}
