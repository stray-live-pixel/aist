import { Rocket, Square } from 'lucide-react';

import { autonomousActions } from '../../../shared/lib/autonomousActions';
import { type AutonomousState } from '../../../shared/types';
import { Badge, Button, Card, CodeBlock, EmptyState, Text } from '../../../shared/ui';
import styles from '../AutonomousPage.module.scss';
import { getStatusTone } from './getStatusTone';

export function SessionsCard({ state }: { state: AutonomousState }) {
  return (
    <Card title="Sessions" description="Последние native autonomous sessions.">
      <div className={styles.sessions}>
        {state.sessions.length ? (
          state.sessions.map((session) => (
            <article key={session.meta.id} className={styles.sessionCard}>
              <div>
                <div className={styles.row}>
                  <strong>{session.meta.targetId || session.meta.id}</strong>
                  <Badge tone={getStatusTone(session.meta.status)}>{session.meta.status}</Badge>
                </div>
                <Text variant="caption">
                  {session.meta.kind} · {session.meta.engineId} · {session.events.length} events
                </Text>
              </div>
              <div className={styles.actions}>
                {session.meta.status === 'running' ? (
                  <Button
                    size="sm"
                    variant="danger"
                    leadingIcon={<Square size={13} />}
                    onClick={() => autonomousActions.stopSession(session.meta.id)}
                  >
                    Stop
                  </Button>
                ) : null}
                <Button size="sm" onClick={() => autonomousActions.exportSession(session.meta.id, 'markdown')}>
                  Export
                </Button>
                <Button size="sm" variant="ghost" onClick={() => autonomousActions.revealSession(session.meta.id)}>
                  Reveal
                </Button>
              </div>
              <CodeBlock
                label="Event tail"
                compact
                value={session.events
                  .slice(-5)
                  .map((event) => `${event.ts} ${event.action}: ${event.message}`)
                  .join('\n')}
              />
            </article>
          ))
        ) : (
          <EmptyState
            icon={<Rocket size={24} />}
            title="Sessions пока нет"
            description="Запустите run или flow в dry-run, чтобы проверить discovery и orchestration без внешних CLI/API."
          />
        )}
      </div>
    </Card>
  );
}
