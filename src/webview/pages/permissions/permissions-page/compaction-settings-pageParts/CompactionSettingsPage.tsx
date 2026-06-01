import { Plus, Trash2 } from 'lucide-react';
import { memo, useMemo } from 'react';

import { useI18n } from '../../../../shared/i18n';
import { agentActions } from '../../../../shared/lib/agentActions';
import {
  type AuxiliaryModelsSettings,
  type AuxiliaryToolModelOverride,
  type CompactionSettings,
  type ModelOption,
  type ReasoningEffort
} from '../../../../shared/types';
import { Button, Card, Select, TextField } from '../../../../shared/ui';
import styles from '../../PermissionsPage.module.scss';
import { clampNumber } from '../utils';

export const CompactionSettingsPage = memo(function CompactionSettingsPage({
  settings,
  auxiliaryModels,
  models
}: {
  settings: CompactionSettings;
  auxiliaryModels: AuxiliaryModelsSettings;
  models: ModelOption[];
}) {
  const { t } = useI18n();
  const modelOptions = useMemo(
    () => [
      { value: '', label: t('settings.auxiliary.usePrimaryModel') },
      ...models.map((model) => ({ value: model.id, label: `${model.name} (${model.id})` }))
    ],
    [models, t]
  );
  const reasoningOptions = useMemo(
    () => [
      { value: 'auto', label: t('reasoning.auto') },
      { value: 'low', label: t('reasoning.low') },
      { value: 'medium', label: t('reasoning.medium') },
      { value: 'high', label: t('reasoning.high') }
    ],
    [t]
  );
  const toolOverrides = auxiliaryModels.tool.overrides;
  const updateOverride = (index: number, patch: Partial<AuxiliaryToolModelOverride>) => {
    agentActions.setAuxiliaryToolModelOverrides(
      toolOverrides.map((override, itemIndex) => (itemIndex === index ? { ...override, ...patch } : override))
    );
  };

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

      <Card
        title={t('settings.auxiliary.toolOverridesTitle')}
        description={t('settings.auxiliary.toolOverridesDescription')}
      >
        <div className={styles.sectionStack}>
          {toolOverrides.map((override, index) => (
            <div className={styles.formGrid} key={`${override.toolName}-${index}`}>
              <TextField
                label={t('settings.auxiliary.toolName')}
                value={override.toolName}
                onChange={(event) => updateOverride(index, { toolName: event.target.value })}
              />
              <Select
                label={t('settings.auxiliary.toolModel')}
                value={override.model}
                options={modelOptions}
                onChange={(event) => updateOverride(index, { model: event.target.value })}
              />
              <Select
                label={t('settings.auxiliary.reasoningEffort')}
                value={override.reasoningEffort}
                options={reasoningOptions}
                onChange={(event) => updateOverride(index, { reasoningEffort: event.target.value as ReasoningEffort })}
              />
              <Select
                label={t('settings.auxiliary.allowTools')}
                value={override.allowTools ? 'enabled' : 'disabled'}
                options={[
                  { value: 'disabled', label: t('settings.auxiliary.noTools') },
                  { value: 'enabled', label: t('settings.auxiliary.withTools') }
                ]}
                onChange={(event) => updateOverride(index, { allowTools: event.target.value === 'enabled' })}
              />
              <Button
                variant="danger"
                size="sm"
                leadingIcon={<Trash2 size={14} />}
                onClick={() =>
                  agentActions.setAuxiliaryToolModelOverrides(
                    toolOverrides.filter((_item, itemIndex) => itemIndex !== index)
                  )
                }
              >
                {t('common.delete')}
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Plus size={14} />}
            onClick={() =>
              agentActions.setAuxiliaryToolModelOverrides([
                ...toolOverrides,
                { toolName: '', model: '', reasoningEffort: 'auto', allowTools: false }
              ])
            }
          >
            {t('settings.auxiliary.addToolOverride')}
          </Button>
        </div>
      </Card>
    </div>
  );
});
