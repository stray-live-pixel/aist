import type { DaemonEvent } from '../../../../cli/daemonProtocol';
import { getDaemonEventChatId } from '../../webview/getDaemonEventChatId';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { notifyBridgeEventListeners } from './notifyBridgeEventListeners';
import { refreshBridgeChat } from './refreshBridgeChat';
import { refreshBridgeState } from './refreshBridgeState';

/**
 * Что это: ставит refresh после daemon event в последовательную очередь.
 * Зачем нужно: события могут приходить быстро, а state-запросы должны применяться в порядке получения.
 * Какую продуктовую проблему решает: UI не показывает старый state поверх нового из-за гонок async-запросов.
 */
export function queueBridgeRefresh({ context, event }: { context: BridgeRuntimeContext; event: DaemonEvent }): void {
  if (context.state.disposed || event.type.startsWith('autonomous.')) {
    return;
  }

  context.state.refreshQueue = context.state.refreshQueue
    .then(async () => {
      const chatId = getDaemonEventChatId(event);
      if (chatId) {
        await refreshBridgeChat({ context, chatId });
      } else {
        await refreshBridgeState({ context });
      }
      notifyBridgeEventListeners({ context, event });
    })
    .catch((error) => context.logger.error('Failed to refresh daemon state after event', error));
}
