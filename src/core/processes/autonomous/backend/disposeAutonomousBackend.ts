import type { AutonomousBackendContext } from './AutonomousBackendContext';

/**
 * Что это: освобождает ресурсы backend и отменяет активные сессии.
 * Зачем нужно: daemon/CLI должны корректно завершать long-running автономные операции при shutdown.
 * Какую продуктовую проблему решает: фоновые процессы не продолжают менять workspace после закрытия клиента.
 */
export function disposeAutonomousBackend({ context }: { context: AutonomousBackendContext }): void {
  for (const controller of context.runningSessions.values()) {
    controller.abort();
  }

  context.runningSessions.clear();
  context.listeners.clear();
}
