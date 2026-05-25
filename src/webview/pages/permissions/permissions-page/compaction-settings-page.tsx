import { memo } from 'react';

import { useI18n } from '../../../shared/i18n';
import { agentActions } from '../../../shared/lib/agentActions';
import type { CompactionSettings } from '../../../shared/types';
import { Card, Select, TextField } from '../../../shared/ui';
import styles from '../PermissionsPage.module.scss';
import { clampNumber } from './utils';

/**
 * Что это: раздел настройки автоматического сжатия контекста.
 * Зачем нужно: удерживает ограничения input-полей рядом с UI и не даёт отправить в extension некорректные числа.
 */
export const CompactionSettingsPage = memo(function CompactionSettingsPage({
  settings
}: {
  settings: CompactionSettings;
}) {
  const { t } = useI18n();
  return (
    <div className={styles.sectionStack}>
      <Card title={t('settings.compaction.title')} description={t('settings.compaction.description')}>
        <div className={styles.formGrid}>
          <Select
            label={t('common.status')}
            value={settings.enabled ? 'enabled' : 'disabled'}
            options={[
              { value: 'enabled', label: t('common.enabled') },
              { value: 'disabled', label: t('common.disabled') }
            ]}
            onChange={(event) => agentActions.setCompactionSettings({ enabled: event.target.value === 'enabled' })}
          />
          <TextField
            label={t('settings.compaction.threshold')}
            type="number"
            min={10}
            max={95}
            value={settings.thresholdPercent}
            onChange={(event) =>
              agentActions.setCompactionSettings({
                thresholdPercent: clampNumber(event.target.value, 10, 95, 70, true)
              })
            }
          />
          <TextField
            label={t('settings.compaction.keepLast')}
            hint={t('settings.compaction.keepLastHint')}
            type="number"
            min={0}
            max={20}
            value={settings.keepLastMessages}
            onChange={(event) =>
              agentActions.setCompactionSettings({ keepLastMessages: clampNumber(event.target.value, 0, 20, 0, true) })
            }
          />
        </div>
      </Card>
    </div>
  );
});
