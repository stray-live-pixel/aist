import type { DaemonEvent } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import type { BridgeRefreshTarget } from './getBridgeRefreshTarget';
import { notifyBridgeBeforeStoreRefreshListeners } from './notifyBridgeBeforeStoreRefreshListeners';
import { notifyBridgeEventListeners } from './notifyBridgeEventListeners';
import { recordAgentRequestPerformanceFromEvent } from './recordAgentRequestPerformanceFromEvent';
import { refreshBridgeChat } from './refreshBridgeChat';
import { refreshBridgeState } from './refreshBridgeState';

/**
 * Что это: выполняет один refresh по daemon event.
 * Зачем нужно: queue-файлы управляют порядком, а здесь остаётся единый сценарий refresh + listener notifications.
 * Какую продуктовую проблему решает: chat-scoped и global очереди не расходятся по поведению telemetry и patch callbacks.
 */
export async function runBridgeRefreshForEvent({
  context,
  event,
  target
}: {
  context: BridgeRuntimeContext;
  event: DaemonEvent;
  target: BridgeRefreshTarget;
}): Promise<void> {
  if (target.kind === 'chat') {
    notifyBridgeBeforeStoreRefreshListeners({ context, event });
    await refreshBridgeChat({ context, chatId: target.chatId });
    notifyBridgeEventListeners({ context, event });
  } else {
    await Promise.all([...context.state.refreshQueuesByChatId.values()]);
    await refreshBridgeState({ context });
    notifyBridgeEventListeners({ context, event });
  }

  recordAgentRequestPerformanceFromEvent({ context, event });
}
