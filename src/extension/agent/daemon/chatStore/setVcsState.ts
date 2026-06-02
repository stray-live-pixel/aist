import type { Chat } from '../../../chats/types';
import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: сохраняет локальный VCS-контекст чата.
 * Зачем нужно: isolated/branch preview может жить в extension до следующего daemon payload.
 * Какую продуктовую проблему решает: пользователь видит актуальную ветку/изоляцию рядом с чатом.
 */
export function setVcsState({
  state,
  chatId,
  vcs
}: {
  state: DaemonChatStoreState;
  chatId: string;
  vcs: Chat['vcs'];
}): void {
  const chat = requireChat({ state, chatId });
  chat.vcs = vcs;
  touchChat({ state, chat });
}
