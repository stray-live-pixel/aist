import { type AutonomousSessionView } from '../../core/processes/autonomous';

export function toAutonomousCompletedEvent(session: AutonomousSessionView): Record<string, unknown> {
  return {
    type: 'autonomous.completed',
    sessionId: session.meta.id,
    kind: session.meta.kind,
    targetId: session.meta.targetId,
    status: session.meta.status,
    error: session.meta.error
  };
}
