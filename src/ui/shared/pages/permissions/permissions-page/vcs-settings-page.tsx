import { GitBranch } from 'lucide-react';
import { memo } from 'react';

import { useI18n } from '../../../i18n';
import { agentActions } from '../../../lib/agentActions';
import { Card, TextField } from '../../../ui';
import styles from '../PermissionsPage.module.scss';

/**
 * Что это: настройки git-like VCS для Composer.
 * Зачем нужно: пользователь может заменить git на arc или другую совместимую команду без ручной правки settings.json.
 * Какую продуктовую проблему решает: проекты без git не ломают UI, а проекты на arc получают те же branch-сценарии.
 */
export const VcsSettingsPage = memo(function VcsSettingsPage({ vcsCommand }: { vcsCommand: string }) {
  const { t } = useI18n();

  return (
    <div className={styles.sectionStack}>
      <Card title={t('settings.vcs.commandTitle')} description={t('settings.vcs.commandDescription')}>
        <TextField
          value={vcsCommand}
          placeholder="git"
          leadingIcon={<GitBranch size={15} />}
          label={t('settings.vcs.commandLabel')}
          hint={t('settings.vcs.commandHint')}
          onChange={(event) => agentActions.setVcsCommand(event.target.value)}
        />
      </Card>
    </div>
  );
});
