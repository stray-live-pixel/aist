import { agentActions } from '../../../../shared/lib/agentActions';
import type { CompactionSettings, ReasoningEffort } from '../../../../shared/types';
import { Card, Select, TextField } from '../../../../shared/ui';
import styles from '../../PermissionsPage.module.scss';
import { clampNumber } from '../utils';
import type { SelectOptionItem, TranslateFn } from './types';

/**
 * Что это: карточка базовых настроек автоматической compaction.
 * Зачем нужно: пользователь управляет порогом, хвостом истории, моделью и tool-доступом compaction.
 * Какую продуктовую проблему решает: длинные чаты автоматически сжимаются предсказуемо и на выбранной модели.
 */
export function CompactionSettingsCard({
  modelOptions,
  reasoningOptions,
  settings,
  t
}: {
  modelOptions: SelectOptionItem[];
  reasoningOptions: SelectOptionItem[];
  settings: CompactionSettings;
  t: TranslateFn;
}) {
  return (
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
            agentActions.setCompactionSettings({ thresholdPercent: clampNumber(event.target.value, 10, 95, 70, true) })
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
        <Select
          label={t('settings.auxiliary.compactionModel')}
          hint={t('settings.auxiliary.compactionModelHint')}
          value={settings.model}
          options={modelOptions}
          onChange={(event) => agentActions.setCompactionSettings({ model: event.target.value })}
        />
        <Select
          label={t('settings.auxiliary.reasoningEffort')}
          value={settings.reasoningEffort}
          options={reasoningOptions}
          onChange={(event) =>
            agentActions.setCompactionSettings({ reasoningEffort: event.target.value as ReasoningEffort })
          }
        />
        <Select
          label={t('settings.auxiliary.allowTools')}
          hint={t('settings.auxiliary.allowToolsHint')}
          value={settings.allowTools ? 'enabled' : 'disabled'}
          options={[
            { value: 'disabled', label: t('settings.auxiliary.noTools') },
            { value: 'enabled', label: t('settings.auxiliary.withTools') }
          ]}
          onChange={(event) => agentActions.setCompactionSettings({ allowTools: event.target.value === 'enabled' })}
        />
      </div>
    </Card>
  );
}
