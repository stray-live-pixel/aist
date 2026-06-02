import type { AutonomousSessionKind } from '../types';
import type { AutonomousBackendContext } from './AutonomousBackendContext';
import { emitAutonomousEvent } from './emitAutonomousEvent';
import { emitAutonomousStateChanged } from './emitAutonomousStateChanged';

/**
 * Что это: публикует событие старта автономной сессии.
 * Зачем нужно: CLI/daemon должны сразу знать kind/target/sessionId нового запуска.
 * Какую продуктовую проблему решает: пользователь получает мгновенную обратную связь после Start.
 */
export function emitAutonomousStarted({
  context,
  sessionId,
  kind,
  targetId
}: {
  context: AutonomousBackendContext;
  sessionId: string;
  kind: AutonomousSessionKind;
  targetId: string;
}): void {
  emitAutonomousEvent({
    context,
    event: {
      type: 'autonomous.session.started',
      workspaceRoot: context.workspaceRoot,
      sessionId,
      kind,
      targetId,
      at: context.now()
    }
  });
  emitAutonomousStateChanged({ context, reason: 'autonomous.start', sessionId });
}
