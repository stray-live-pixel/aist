import { Plus } from 'lucide-react';
import { memo, useMemo, useState } from 'react';

import { useI18n } from '../../../../shared/i18n';
import { type AgentItemScope, type AgentPromptConfig } from '../../../../shared/types';
import { Button, Card } from '../../../../shared/ui';
import styles from '../../PermissionsPage.module.scss';
import { PresetEditor } from './PresetEditor';
import { PresetListItem } from './PresetListItem';
import { getPresetScope } from './getPresetScope';

export const PromptPriorityManager = memo(function PromptPriorityManager({
  promptConfig,
  scope
}: {
  promptConfig: AgentPromptConfig;
  scope: AgentItemScope;
}) {
  const { t } = useI18n();
  const scopedPresets = useMemo(
    () => promptConfig.presets.filter((preset) => getPresetScope(preset) === scope),
    [promptConfig.presets, scope]
  );
  const [selectedPresetId, setSelectedPresetId] = useState('new');
  const selectedPreset = scopedPresets.find((preset) => preset.id === selectedPresetId);

  return (
    <div className={styles.sectionStack}>
      <Card
        title={t(`settings.promptManager.preset.${scope}.title` as never)}
        description={t('settings.promptManager.presetsDescription')}
        actions={
          <Button size="sm" leadingIcon={<Plus size={14} />} onClick={() => setSelectedPresetId('new')}>
            {t('settings.promptManager.addPreset')}
          </Button>
        }
      >
        <div className={styles.list}>
          {scopedPresets.map((preset) => (
            <PresetListItem
              key={preset.id}
              preset={preset}
              promptConfig={promptConfig}
              selected={preset.id === selectedPresetId}
              onSelect={() => setSelectedPresetId(preset.id)}
            />
          ))}
          {!scopedPresets.length ? <p className={styles.empty}>{t('settings.promptManager.noPresets')}</p> : null}
        </div>
      </Card>
      <PresetEditor
        preset={selectedPreset}
        promptConfig={promptConfig}
        scope={scope}
        key={selectedPreset?.id || `new:${scope}`}
      />
    </div>
  );
});
