import { type AutonomousState } from '../../../shared/types';
import { Badge, Text } from '../../../shared/ui';
import styles from '../AutonomousPage.module.scss';

export function AutonomousHeader({
  state,
  legacyCount,
  actions
}: {
  state: AutonomousState;
  legacyCount: number;
  actions: React.ReactNode;
}) {
  return (
    <header className={styles.hero}>
      <div>
        <Text variant="caption">{state.workspaceName}</Text>
        <h1 className={styles.title}>Autonomous Runner</h1>
        <Text variant="caption">Нативные flow/run definitions из `.aist-agent/autonomous`.</Text>
      </div>
      <div className={styles.heroActions}>
        <Badge tone={legacyCount ? 'warning' : 'success'}>{legacyCount} legacy</Badge>
        {actions}
      </div>
    </header>
  );
}
