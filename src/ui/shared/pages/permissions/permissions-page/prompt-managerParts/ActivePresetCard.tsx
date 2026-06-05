import { memo, useState } from 'react';

import { useI18n } from '../../../../shared/i18n';
import { agentActions } from '../../../../shared/lib/agentActions';
import { type AgentPromptConfig } from '../../../../shared/types';
import { Badge, Button, Card, Select } from '../../../../shared/ui';
import styles from '../../PermissionsPage.module.scss';
import { scopeLabel } from '../utils';
import { PresetDetails } from './PresetDetails';

export const ActivePresetCard = memo(function ActivePresetCard({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  const { t } = useI18n();
  const [presetId, setPresetId] = useState(promptConfig.activePresetId || '');
  const selectedPreset = promptConfig.presets.find((preset) => preset.id === presetId);
  const activePreset = promptConfig.activePresetId
    ? promptConfig.presets.find((preset) => preset.id === promptConfig.activePresetId)
    : undefined;
  const changed = presetId !== (promptConfig.activePresetId || '');

  return (
    <Card
      title={t('settings.promptManager.activePresetTitle')}
      description={t('settings.promptManager.activePresetDescription')}
      actions={
        <Button
          size="sm"
          variant="primary"
          disabled={!presetId || !changed}
          onClick={() => agentActions.applyPromptPreset(presetId)}
        >
          {t('settings.promptManager.applyPreset')}
        </Button>
      }
    >
      <div className={styles.formGrid}>
        <Select
          label={t('settings.promptManager.choosePreset')}
          value={presetId}
          placeholder={t('settings.promptManager.choosePreset')}
          options={promptConfig.presets.map((preset) => ({
            value: preset.id,
            label: `${scopeLabel(preset.scope, t)} · ${preset.label}`
          }))}
          onChange={(event) => setPresetId(event.target.value)}
        />
        <div className={styles.statusRow}>
          <Badge tone={changed ? 'warning' : 'success'}>
            {changed ? t('settings.promptManager.pendingApply') : t('settings.promptManager.applied')}
          </Badge>
          <span className={styles.mutedText}>
            {activePreset
              ? t('settings.promptManager.currentPreset', { preset: activePreset.label })
              : t('settings.promptManager.noActivePreset')}
          </span>
        </div>
        {selectedPreset ? <PresetDetails preset={selectedPreset} promptConfig={promptConfig} /> : null}
      </div>
    </Card>
  );
});
