import type { DaemonChat } from '../../../../cli/daemonProtocol';

/**
 * Что это: выбирает чат, который нужно оставить активным при полном refresh из daemon.
 * Зачем нужно: lifecycle-события isolated-сессии могут менять activeRun, но не должны сами переключать UI на Docker-чат.
 * Какую продуктовую проблему решает: стандартный isolated-чат открывается явной кнопкой, а не внезапным full state refresh.
 */
export function getPreservedBridgeActiveChatId({
  chats,
  savedActiveChatId,
  currentActiveChatId
}: {
  chats: readonly Pick<DaemonChat, 'id'>[];
  savedActiveChatId?: string;
  currentActiveChatId?: string;
}): string | undefined {
  const chatIds = new Set(chats.map((chat) => chat.id));
  if (currentActiveChatId && chatIds.has(currentActiveChatId)) {
    return currentActiveChatId;
  }

  if (savedActiveChatId && chatIds.has(savedActiveChatId)) {
    return savedActiveChatId;
  }

  return undefined;
}
