import { CheckCircle2, LogIn, LogOut } from 'lucide-react';

import { useI18n } from '../../../../i18n';
import { agentActions } from '../../../../lib/agentActions';
import { Badge, Button } from '../../../../ui';
import styles from '../../PermissionsPage.module.scss';

export function CodexAuthRow({ authenticated }: { authenticated: boolean }) {
  const { t } = useI18n();

  return authenticated ? (
    <div className={styles.actions}>
      <Badge tone="success" icon={<CheckCircle2 size={12} />}>
        {t('common.authorized')}
      </Badge>
      <Button variant="secondary" size="sm" leadingIcon={<LogOut size={14} />} onClick={agentActions.codexLogout}>
        {t('settings.system.logout')}
      </Button>
    </div>
  ) : (
    <Button variant="primary" size="sm" leadingIcon={<LogIn size={14} />} onClick={agentActions.codexLogin}>
      {t('common.authorize')}
    </Button>
  );
}
