import type { AutonomousBackendContext } from './AutonomousBackendContext';
import { emitAutonomousEvent } from './emitAutonomousEvent';

/**
 * Что это: публикует событие изменения состояния автономного workspace.
 * Зачем нужно: UI обновляет список flows/runs/sessions после create/save/start/finish/stop.
 * Какую продуктовую проблему решает: пользователь видит актуальный autonomous state без ручного refresh.
 */
export function emitAutonomousStateChanged({
  context,
  reason,
  sessionId
}: {
  context: AutonomousBackendContext;
  reason: string;
  sessionId?: string;
}): void {
  emitAutonomousEvent({
    context,
    event: {
      type: 'autonomous.state.changed',
      workspaceRoot: context.workspaceRoot,
      reason,
      sessionId,
      at: context.now()
    }
  });
}
