import type { AutonomousSessionStatus } from '../types';
import type { AutonomousBackendContext } from './AutonomousBackendContext';
import { emitAutonomousEvent } from './emitAutonomousEvent';
import { emitAutonomousStateChanged } from './emitAutonomousStateChanged';

/**
 * Что это: публикует завершение автономной сессии с итоговым статусом.
 * Зачем нужно: status берётся из sessionStore, а при ошибке чтения отдаётся безопасный error.
 * Какую продуктовую проблему решает: UI/CLI всегда получают финальное событие и могут закрыть progress state.
 */
export async function emitAutonomousFinished({
  context,
  sessionId
}: {
  context: AutonomousBackendContext;
  sessionId: string;
}): Promise<void> {
  let status: AutonomousSessionStatus = 'finished';

  try {
    status = (await context.sessionStore.readSession(sessionId, 0)).meta.status;
  } catch {
    status = 'error';
  }

  emitAutonomousEvent({
    context,
    event: {
      type: 'autonomous.session.finished',
      workspaceRoot: context.workspaceRoot,
      sessionId,
      status,
      at: context.now()
    }
  });
  emitAutonomousStateChanged({ context, reason: 'autonomous.finish', sessionId });
}
