import type { DaemonEvent } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';

/**
 * Что это: рассылает daemon event подписчикам bridge.
 * Зачем нужно: listeners могут меняться во время обработки, поэтому используется snapshot массива.
 * Какую продуктовую проблему решает: controllers получают стабильные события без пропусков и ошибок итерации.
 */
export function notifyBridgeEventListeners({
  context,
  event
}: {
  context: BridgeRuntimeContext;
  event: DaemonEvent;
}): void {
  for (const listener of [...context.state.eventListeners]) {
    listener(event);
  }
}
