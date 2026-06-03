import type { DaemonEvent } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { runBridgeRefreshForEvent } from './runBridgeRefreshForEvent';

/**
 * Что это: ставит global state refresh в отдельную очередь.
 * Зачем нужно: события без chatId всё ещё должны выполняться последовательно и аккуратно ждать активные chat refresh перед replaceAll.
 * Какую продуктовую проблему решает: глобальное обновление не затирает более свежие точечные обновления конкретных чатов.
 */
export function queueBridgeStateRefresh({
  context,
  event
}: {
  context: BridgeRuntimeContext;
  event: DaemonEvent;
}): void {
  context.state.refreshQueue = context.state.refreshQueue
    .then(() => runBridgeRefreshForEvent({ context, event, target: { kind: 'state' } }))
    .catch((error) => context.logger.error('Failed to refresh daemon state after event', error));
}
