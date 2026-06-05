import { agentActions } from '../../../../shared/lib/agentActions';
import type { AuxiliaryModelsSettings, ReasoningEffort } from '../../../../shared/types';
import { Card, Select } from '../../../../shared/ui';
import styles from '../../PermissionsPage.module.scss';
import type { SelectOptionItem, TranslateFn } from './types';

/**
 * Что это: карточка default-настроек вспомогательной модели для tool calls.
 * Зачем нужно: пользователь отдельно выбирает модель, reasoning и tool-доступ для auxiliary tool-сценариев.
 * Какую продуктовую проблему решает: тяжёлые tool операции можно выполнять более дешёвой или специализированной моделью.
 */
export function ToolModelSettingsCard({
  auxiliaryModels,
  modelOptions,
  reasoningOptions,
  t
}: {
  auxiliaryModels: AuxiliaryModelsSettings;
  modelOptions: SelectOptionItem[];
  reasoningOptions: SelectOptionItem[];
  t: TranslateFn;
}) {
  return (
    <Card title={t('settings.auxiliary.toolTitle')} description={t('settings.auxiliary.toolDescription')}>
      <div className={styles.formGrid}>
        <Select
          label={t('settings.auxiliary.toolModel')}
          hint={t('settings.auxiliary.toolModelHint')}
          value={auxiliaryModels.tool.model}
          options={modelOptions}
          onChange={(event) => agentActions.setAuxiliaryModelSettings('tool', { model: event.target.value })}
        />
        <Select
          label={t('settings.auxiliary.reasoningEffort')}
          value={auxiliaryModels.tool.reasoningEffort}
          options={reasoningOptions}
          onChange={(event) =>
            agentActions.setAuxiliaryModelSettings('tool', { reasoningEffort: event.target.value as ReasoningEffort })
          }
        />
        <Select
          label={t('settings.auxiliary.allowTools')}
          hint={t('settings.auxiliary.toolAllowToolsHint')}
          value={auxiliaryModels.tool.allowTools ? 'enabled' : 'disabled'}
          options={[
            { value: 'disabled', label: t('settings.auxiliary.noTools') },
            { value: 'enabled', label: t('settings.auxiliary.withTools') }
          ]}
          onChange={(event) =>
            agentActions.setAuxiliaryModelSettings('tool', { allowTools: event.target.value === 'enabled' })
          }
        />
      </div>
    </Card>
  );
}
