import type { DaemonEvent } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { runBridgeRefreshForEvent } from './runBridgeRefreshForEvent';

/**
 * Что это: ставит chat-scoped refresh в очередь конкретного чата с коалесцированием.
 * Зачем нужно: события разных чатов не ждут друг друга, а лавина progress одного чата схлопывается в один pending refresh.
 * Какую продуктовую проблему решает: два параллельных агента обновляют UI независимо и без лишней цепочки одинаковых chat.get.
 */
export function queueBridgeChatRefresh({
  context,
  event,
  chatId
}: {
  context: BridgeRuntimeContext;
  event: DaemonEvent;
  chatId: string;
}): void {
  if (context.state.pendingChatRefreshes.has(chatId)) {
    return;
  }

  context.state.pendingChatRefreshes.add(chatId);
  const previousQueue = context.state.refreshQueuesByChatId.get(chatId) || Promise.resolve();
  const currentQueue = previousQueue
    .catch(() => undefined)
    .then(() => runBridgeRefreshForEvent({ context, event, target: { kind: 'chat', chatId } }))
    .catch((error) => context.logger.error('Failed to refresh daemon chat after event', error))
    .finally(() => {
      context.state.pendingChatRefreshes.delete(chatId);
      if (context.state.refreshQueuesByChatId.get(chatId) === currentQueue) {
        context.state.refreshQueuesByChatId.delete(chatId);
      }
    });

  context.state.refreshQueuesByChatId.set(chatId, currentQueue);
}
