import { Save, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { useI18n } from '../../../../i18n';
import { agentActions } from '../../../../lib/agentActions';
import {
  type AgentItemRef,
  type AgentItemScope,
  type AgentPromptConfig,
  type AgentPromptPreset
} from '../../../../types';
import { Button, Card, Select, TextField } from '../../../../ui';
import styles from '../../PermissionsPage.module.scss';
import { parseRefKey, refKey, scopeLabel } from '../utils';
import { InstructionPicker } from './InstructionPicker';

export function PresetEditor({
  preset,
  promptConfig,
  scope
}: {
  preset?: AgentPromptPreset;
  promptConfig: AgentPromptConfig;
  scope: AgentItemScope;
}) {
  const { t } = useI18n();
  const roles = useMemo(() => [...promptConfig.globalModes, ...promptConfig.localModes], [promptConfig]);
  const allInstructions = useMemo(
    () => [...promptConfig.globalInstructions, ...promptConfig.localInstructions],
    [promptConfig]
  );
  const [label, setLabel] = useState(preset?.label || '');
  const [roleKey, setRoleKey] = useState(preset?.modeRef ? refKey(preset.modeRef) : '');
  const [instructionRefs, setInstructionRefs] = useState<AgentItemRef[]>(preset?.instructionRefs || []);
  const selectedRefKeys = useMemo(() => new Set(instructionRefs.map(refKey)), [instructionRefs]);
  const canSave = Boolean(label.trim());

  const toggleInstruction = useCallback((ref: AgentItemRef, checked: boolean) => {
    setInstructionRefs((current) =>
      checked ? [...current, ref] : current.filter((item) => refKey(item) !== refKey(ref))
    );
  }, []);

  function savePreset() {
    agentActions.upsertPromptPreset({
      id: preset?.id,
      label: label.trim(),
      instructionRefs,
      modeRef: parseRefKey(roleKey),
      scope
    });
  }

  return (
    <Card
      title={preset ? t('settings.promptManager.editPreset') : t('settings.promptManager.newPreset')}
      description={t('settings.promptManager.presetEditorDescription')}
      actions={
        preset ? (
          <div className={styles.actions}>
            <Button size="sm" variant="secondary" onClick={() => agentActions.applyPromptPreset(preset.id)}>
              {t('settings.promptManager.apply')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              leadingIcon={<Trash2 size={13} />}
              onClick={() => agentActions.deletePromptPreset(preset.id)}
            >
              {t('common.delete')}
            </Button>
          </div>
        ) : null
      }
    >
      <div className={styles.formGrid}>
        <TextField
          label={t('settings.promptManager.presetName')}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder={t('settings.promptManager.presetNamePlaceholder')}
          autoFocus
        />
        <Select
          label={t('systemInstructions.roleSelect')}
          value={roleKey}
          placeholder={t('systemInstructions.noRole')}
          options={[
            { value: '', label: t('systemInstructions.noRole') },
            ...roles.map((role) => ({ value: refKey(role), label: `${scopeLabel(role.scope, t)} · ${role.label}` }))
          ]}
          onChange={(event) => setRoleKey(event.target.value)}
        />
        <InstructionPicker
          title={t('settings.promptManager.presetInstructions')}
          instructions={allInstructions}
          selectedRefKeys={selectedRefKeys}
          onToggle={toggleInstruction}
        />
        <div className={styles.actions}>
          <Button size="sm" variant="primary" disabled={!canSave} leadingIcon={<Save size={13} />} onClick={savePreset}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
