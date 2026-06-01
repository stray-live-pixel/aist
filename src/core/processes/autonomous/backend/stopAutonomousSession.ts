import type { AutonomousBackendContext } from './AutonomousBackendContext';
import type { AutonomousStopResult } from './AutonomousStopResult';
import { emitAutonomousStateChanged } from './emitAutonomousStateChanged';

/**
 * Что это: останавливает активную автономную сессию через AbortController.
 * Зачем нужно: пользовательская команда Stop должна прерывать flow/run executor.
 * Какую продуктовую проблему решает: долгий автономный запуск можно безопасно отменить из UI/CLI.
 */
export function stopAutonomousSession({
  context,
  sessionId
}: {
  context: AutonomousBackendContext;
  sessionId: string;
}): AutonomousStopResult {
  const controller = context.runningSessions.get(sessionId);
  if (controller) {
    controller.abort();
    emitAutonomousStateChanged({ context, reason: 'autonomous.stop', sessionId });
  }

  return { operationId: context.idFactory(), stopped: Boolean(controller), sessionId };
}
