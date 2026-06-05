import { memo, useMemo } from 'react';

import { useI18n } from '../../../../i18n';
import { type AgentPromptConfig, type AgentPromptPreset } from '../../../../types';
import { Badge } from '../../../../ui';
import styles from '../../PermissionsPage.module.scss';
import { refKey } from '../utils';

export const PresetListItem = memo(function PresetListItem({
  preset,
  promptConfig,
  selected,
  onSelect
}: {
  preset: AgentPromptPreset;
  promptConfig: AgentPromptConfig;
  selected: boolean;
  onSelect(): void;
}) {
  const { t } = useI18n();
  const allRoles = useMemo(() => [...promptConfig.globalModes, ...promptConfig.localModes], [promptConfig]);
  const role = preset.modeRef ? allRoles.find((item) => refKey(item) === refKey(preset.modeRef!)) : undefined;
  const active = preset.id === promptConfig.activePresetId;

  return (
    <button
      type="button"
      className={`${styles.navButton} ${selected ? styles.navButtonActive : ''}`}
      onClick={onSelect}
    >
      <span>{preset.label}</span>
      {active ? <Badge tone="success">{t('settings.promptManager.activePreset')}</Badge> : null}
      <span className={styles.navMeta}>
        {t('settings.promptManager.presetDescription', {
          count: preset.instructionRefs.length,
          mode: role ? role.label : t('systemInstructions.noRole')
        })}
      </span>
    </button>
  );
});
