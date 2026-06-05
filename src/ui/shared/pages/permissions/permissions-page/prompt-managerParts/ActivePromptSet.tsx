import { memo, useCallback, useMemo, useState } from 'react';

import { useI18n } from '../../../../i18n';
import { agentActions } from '../../../../lib/agentActions';
import { type AgentItemRef, type AgentPromptConfig } from '../../../../types';
import { Badge, Button, Card, Select } from '../../../../ui';
import styles from '../../PermissionsPage.module.scss';
import { parseRefKey, refKey, scopeLabel } from '../utils';
import { InstructionPicker } from './InstructionPicker';

export const ActivePromptSet = memo(function ActivePromptSet({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  const { t } = useI18n();
  const allRoles = useMemo(() => [...promptConfig.globalModes, ...promptConfig.localModes], [promptConfig]);
  const allInstructions = useMemo(
    () => [...promptConfig.globalInstructions, ...promptConfig.localInstructions],
    [promptConfig]
  );
  const [roleKey, setRoleKey] = useState(promptConfig.activeModeRef ? refKey(promptConfig.activeModeRef) : '');
  const [instructionRefs, setInstructionRefs] = useState<AgentItemRef[]>(promptConfig.activeInstructionRefs);
  const selectedRefKeys = useMemo(() => new Set(instructionRefs.map(refKey)), [instructionRefs]);
  const activeSignature = `${promptConfig.activeModeRef ? refKey(promptConfig.activeModeRef) : ''}|${promptConfig.activeInstructionRefs.map(refKey).join(',')}`;
  const draftSignature = `${roleKey}|${instructionRefs.map(refKey).join(',')}`;
  const changed = activeSignature !== draftSignature;

  const toggleInstruction = useCallback((ref: AgentItemRef, checked: boolean) => {
    setInstructionRefs((current) =>
      checked ? [...current, ref] : current.filter((item) => refKey(item) !== refKey(ref))
    );
  }, []);

  return (
    <Card
      title={t('settings.promptManager.activeTitle')}
      description={t('settings.promptManager.activeDescription')}
      actions={
        <div className={styles.actions}>
          <Badge tone={changed ? 'warning' : 'success'}>
            {changed ? t('settings.promptManager.pendingApply') : t('settings.promptManager.applied')}
          </Badge>
          <Button
            size="sm"
            variant="primary"
            disabled={!changed}
            onClick={() => agentActions.setActivePromptConfig(instructionRefs, parseRefKey(roleKey))}
          >
            {t('settings.promptManager.applyActiveSet')}
          </Button>
        </div>
      }
    >
      <div className={styles.formGrid}>
        <Select
          label={t('systemInstructions.roleSelect')}
          value={roleKey}
          placeholder={t('systemInstructions.noRole')}
          options={[
            { value: '', label: t('systemInstructions.noRole') },
            ...allRoles.map((role) => ({ value: refKey(role), label: `${scopeLabel(role.scope, t)} · ${role.label}` }))
          ]}
          onChange={(event) => setRoleKey(event.target.value)}
        />
        <InstructionPicker
          title={t('settings.promptManager.connectedInstructions')}
          instructions={allInstructions}
          selectedRefKeys={selectedRefKeys}
          onToggle={toggleInstruction}
        />
      </div>
    </Card>
  );
});
