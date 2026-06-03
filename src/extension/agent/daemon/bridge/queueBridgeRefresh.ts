import type { DaemonEvent } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { getBridgeRefreshTarget } from './getBridgeRefreshTarget';
import { queueBridgeChatRefresh } from './queueBridgeChatRefresh';
import { queueBridgeStateRefresh } from './queueBridgeStateRefresh';

/**
 * Что это: маршрутизирует refresh после daemon event в global или chat-scoped очередь.
 * Зачем нужно: события разных чатов не должны блокировать друг друга одной общей Promise-цепочкой.
 * Какую продуктовую проблему решает: параллельные агенты остаются отзывчивыми, а события одного чата сохраняют порядок.
 */
export function queueBridgeRefresh({ context, event }: { context: BridgeRuntimeContext; event: DaemonEvent }): void {
  if (context.state.disposed || event.type.startsWith('autonomous.') || event.type === 'isolation.session.log') {
    return;
  }

  const target = getBridgeRefreshTarget({ event });
  if (target.kind === 'chat') {
    queueBridgeChatRefresh({ context, event, chatId: target.chatId });
    return;
  }

  queueBridgeStateRefresh({ context, event });
}
