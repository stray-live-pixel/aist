import { Plus, Trash2 } from 'lucide-react';

import { agentActions } from '../../../../shared/lib/agentActions';
import type { AuxiliaryModelsSettings, AuxiliaryToolModelOverride, ReasoningEffort } from '../../../../shared/types';
import { Button, Card, Select, TextField } from '../../../../shared/ui';
import styles from '../../PermissionsPage.module.scss';
import type { SelectOptionItem, TranslateFn } from './types';

/**
 * Что это: карточка per-tool overrides для auxiliary model settings.
 * Зачем нужно: отдельные tools могут требовать другую модель, reasoning или запрет tools внутри auxiliary вызова.
 * Какую продуктовую проблему решает: пользователь тонко настраивает дорогие/опасные tools без изменения global defaults.
 */
export function ToolOverridesSettingsCard({
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
  const toolOverrides = auxiliaryModels.tool.overrides;
  const updateOverride = (index: number, patch: Partial<AuxiliaryToolModelOverride>) => {
    agentActions.setAuxiliaryToolModelOverrides(
      toolOverrides.map((override, itemIndex) => (itemIndex === index ? { ...override, ...patch } : override))
    );
  };

  return (
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
  );
}
