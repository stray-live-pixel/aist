import { Play } from 'lucide-react';

import { type AutonomousRunDefinition } from '../../../shared/types';
import { Badge, Button, Card, Text } from '../../../shared/ui';
import styles from '../AutonomousPage.module.scss';

export function RunList({
  items,
  onStart
}: {
  items: AutonomousRunDefinition[];
  onStart(item: AutonomousRunDefinition): void;
}) {
  return (
    <Card title="Runs" description={`${items.length} packages`}>
      <div className={styles.list}>
        {items.map((run) => (
          <article key={run.id} className={styles.definition}>
            <div className={styles.row}>
              <strong>{run.title}</strong>
              <Badge tone={run.sourceKind === 'legacy' ? 'warning' : 'success'}>{run.sourceKind}</Badge>
            </div>
            <Text variant="caption">
              {run.tasks.length} tasks · repeat {run.repeat}
            </Text>
            <Text variant="caption">{run.workDir || 'dir missing'}</Text>
            <Button size="sm" leadingIcon={<Play size={13} />} onClick={() => onStart(run)}>
              Start
            </Button>
          </article>
        ))}
      </div>
    </Card>
  );
}
