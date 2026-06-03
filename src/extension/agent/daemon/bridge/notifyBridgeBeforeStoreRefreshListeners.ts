import type { DaemonEvent } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';

/**
 * Что это: раннее уведомление перед refresh store по daemon event.
 * Зачем нужно: controller успевает зарезервировать suppression до changedEmitter.fire() от chat upsert.
 * Какую продуктовую проблему решает: webview получает incremental patch без лишнего полного state broadcast на горячем пути агента.
 */
export function notifyBridgeBeforeStoreRefreshListeners({
  context,
  event
}: {
  context: BridgeRuntimeContext;
  event: DaemonEvent;
}): void {
  for (const listener of [...context.state.beforeStoreRefreshListeners]) {
    listener(event);
  }
}
