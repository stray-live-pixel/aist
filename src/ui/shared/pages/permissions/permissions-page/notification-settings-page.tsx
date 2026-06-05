import { memo } from 'react';

import { useI18n } from '../../../i18n';
import { agentActions } from '../../../lib/agentActions';
import type { ApprovalNotificationSettings } from '../../../types';
import { Card, Checkbox, Select, TextField } from '../../../ui';
import styles from '../PermissionsPage.module.scss';
import { clampNumber } from './utils';

/**
 * Что это: раздел управления уведомлениями approval-запросов.
 * Зачем нужно: все IPC-обновления settings централизованы здесь, а числовые поля приводятся к безопасным диапазонам до отправки.
 */
export const NotificationSettingsPage = memo(function NotificationSettingsPage({
  settings
}: {
  settings: ApprovalNotificationSettings;
}) {
  const { t } = useI18n();

  return (
    <div className={styles.sectionStack}>
      <Card title={t('settings.notifications.title')} description={t('settings.notifications.description')}>
        <div className={styles.formGrid}>
          <Select
            label={t('common.status')}
            value={settings.enabled ? 'enabled' : 'disabled'}
            options={[
              { value: 'enabled', label: t('common.enabled') },
              { value: 'disabled', label: t('common.disabled') }
            ]}
            onChange={(event) =>
              agentActions.setApprovalNotificationSettings({ enabled: event.target.value === 'enabled' })
            }
          />
          <Checkbox
            label={t('settings.notifications.system')}
            description={t('settings.notifications.systemDescription')}
            checked={settings.systemNotifications}
            disabled={!settings.enabled}
            onChange={(event) =>
              agentActions.setApprovalNotificationSettings({ systemNotifications: event.target.checked })
            }
          />
          <Checkbox
            label={t('settings.notifications.sound')}
            description={t('settings.notifications.soundDescription')}
            checked={settings.sound}
            disabled={!settings.enabled}
            onChange={(event) => agentActions.setApprovalNotificationSettings({ sound: event.target.checked })}
          />
          <TextField
            label={t('settings.notifications.volume')}
            type="number"
            min={0}
            max={100}
            value={Math.round(settings.volume * 100)}
            disabled={!settings.enabled || !settings.sound}
            onChange={(event) =>
              agentActions.setApprovalNotificationSettings({ volume: clampNumber(event.target.value, 0, 100, 0) / 100 })
            }
          />
          <TextField
            label={t('settings.notifications.duration')}
            type="number"
            min={1}
            max={30}
            value={settings.durationSeconds}
            disabled={!settings.enabled || !settings.sound}
            onChange={(event) =>
              agentActions.setApprovalNotificationSettings({
                durationSeconds: clampNumber(event.target.value, 1, 30, 5, true)
              })
            }
          />
        </div>
      </Card>
    </div>
  );
});
