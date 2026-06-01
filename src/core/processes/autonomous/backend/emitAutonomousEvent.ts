import type { AutonomousBackendContext } from './AutonomousBackendContext';
import type { AutonomousBackendEvent } from './AutonomousBackendEvent';

/**
 * Что это: рассылка события автономного backend всем подписчикам.
 * Зачем нужно: listeners могут отписываться во время обработки, поэтому идём по snapshot массива.
 * Какую продуктовую проблему решает: CLI/daemon получают стабильный stream событий без пропусков из-за мутаций Set.
 */
export function emitAutonomousEvent({
  context,
  event
}: {
  context: AutonomousBackendContext;
  event: AutonomousBackendEvent;
}): void {
  for (const listener of [...context.listeners]) {
    listener(event);
  }
}
