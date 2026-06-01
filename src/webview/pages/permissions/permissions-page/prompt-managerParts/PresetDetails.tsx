import { useMemo } from 'react';

import { useI18n } from '../../../../shared/i18n';
import { type AgentInstructionItem, type AgentPromptConfig, type AgentPromptPreset } from '../../../../shared/types';
import styles from '../../PermissionsPage.module.scss';
import { refKey } from '../utils';
import { MarkdownPreview } from './MarkdownPreview';

export function PresetDetails({
  preset,
  promptConfig
}: {
  preset: AgentPromptPreset;
  promptConfig: AgentPromptConfig;
}) {
  const { t } = useI18n();
  const allRoles = useMemo(() => [...promptConfig.globalModes, ...promptConfig.localModes], [promptConfig]);
  const allInstructions = useMemo(
    () => [...promptConfig.globalInstructions, ...promptConfig.localInstructions],
    [promptConfig]
  );
  const role = preset.modeRef ? allRoles.find((item) => refKey(item) === refKey(preset.modeRef!)) : undefined;
  const instructions = preset.instructionRefs
    .map((ref) => allInstructions.find((instruction) => refKey(instruction) === refKey(ref)))
    .filter(Boolean) as AgentInstructionItem[];

  return (
    <div className={styles.formGrid}>
      <div className={styles.reliabilityHint}>
        {t('settings.promptManager.presetDescription', {
          count: preset.instructionRefs.length,
          mode: role ? role.label : t('systemInstructions.noRole')
        })}
      </div>
      <MarkdownPreview markdown={role?.instructions || ''} emptyText={t('systemInstructions.noRole')} />
      <div className={styles.list}>
        {instructions.map((instruction) => (
          <MarkdownPreview
            key={`${instruction.scope}:${instruction.id}`}
            markdown={instruction.content}
            emptyText={t('systemInstructions.noAdditional')}
          />
        ))}
        {!instructions.length ? <p className={styles.empty}>{t('settings.promptManager.noInstructions')}</p> : null}
      </div>
    </div>
  );
}
