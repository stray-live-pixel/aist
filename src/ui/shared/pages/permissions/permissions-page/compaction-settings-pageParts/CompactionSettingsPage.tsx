import { memo, useMemo } from 'react';

import { useI18n } from '../../../../shared/i18n';
import type { AuxiliaryModelsSettings, CompactionSettings, ModelOption } from '../../../../shared/types';
import styles from '../../PermissionsPage.module.scss';
import { CompactionSettingsCard } from './CompactionSettingsCard';
import { ToolModelSettingsCard } from './ToolModelSettingsCard';
import { ToolOverridesSettingsCard } from './ToolOverridesSettingsCard';

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

  return (
    <div className={styles.sectionStack}>
      <CompactionSettingsCard
        settings={settings}
        modelOptions={modelOptions}
        reasoningOptions={reasoningOptions}
        t={t}
      />
      <ToolModelSettingsCard
        auxiliaryModels={auxiliaryModels}
        modelOptions={modelOptions}
        reasoningOptions={reasoningOptions}
        t={t}
      />
      <ToolOverridesSettingsCard
        auxiliaryModels={auxiliaryModels}
        modelOptions={modelOptions}
        reasoningOptions={reasoningOptions}
        t={t}
      />
    </div>
  );
});
