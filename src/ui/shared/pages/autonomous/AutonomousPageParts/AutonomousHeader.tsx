import { useI18n } from '../../../i18n';
import { type AutonomousState } from '../../../types';
import { Badge, Text } from '../../../ui';
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
  const { t } = useI18n();

  return (
    <header className={styles.hero}>
      <div>
        <Text variant="caption">{state.workspaceName}</Text>
        <h1 className={styles.title}>{t('autonomous.workflows.title')}</h1>
        <Text variant="caption">{t('autonomous.workflows.description')}</Text>
      </div>
      <div className={styles.heroActions}>
        <Badge tone={legacyCount ? 'warning' : 'success'}>{legacyCount} legacy</Badge>
        {actions}
      </div>
    </header>
  );
}
