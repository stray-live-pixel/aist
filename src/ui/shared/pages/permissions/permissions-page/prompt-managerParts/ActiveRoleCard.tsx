import { memo, useMemo, useState } from 'react';

import { useI18n } from '../../../../i18n';
import { agentActions } from '../../../../lib/agentActions';
import { type AgentPromptConfig } from '../../../../types';
import { Badge, Button, Card, Select } from '../../../../ui';
import styles from '../../PermissionsPage.module.scss';
import { parseRefKey, refKey, scopeLabel } from '../utils';
import { MarkdownPreview } from './MarkdownPreview';

export const ActiveRoleCard = memo(function ActiveRoleCard({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  const { t } = useI18n();
  const allRoles = useMemo(() => [...promptConfig.globalModes, ...promptConfig.localModes], [promptConfig]);
  const [roleKey, setRoleKey] = useState(promptConfig.activeModeRef ? refKey(promptConfig.activeModeRef) : '');
  const selectedRole = allRoles.find((role) => refKey(role) === roleKey);
  const currentRole = promptConfig.activeModeRef
    ? allRoles.find((role) => refKey(role) === refKey(promptConfig.activeModeRef!))
    : undefined;
  const changed = roleKey !== (promptConfig.activeModeRef ? refKey(promptConfig.activeModeRef) : '');

  return (
    <Card
      title={t('settings.promptManager.activeRoleTitle')}
      description={t('settings.promptManager.activeRoleDescription')}
      actions={
        <Button
          size="sm"
          variant="primary"
          disabled={!changed}
          onClick={() => agentActions.setActivePromptConfig(promptConfig.activeInstructionRefs, parseRefKey(roleKey))}
        >
          {t('settings.promptManager.applyRole')}
        </Button>
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
        <div className={styles.statusRow}>
          <Badge tone={changed ? 'warning' : 'success'}>
            {changed ? t('settings.promptManager.pendingApply') : t('settings.promptManager.applied')}
          </Badge>
          <span className={styles.mutedText}>
            {currentRole
              ? t('settings.promptManager.currentRole', { role: currentRole.label })
              : t('systemInstructions.noRole')}
          </span>
        </div>
        {selectedRole ? (
          <MarkdownPreview markdown={selectedRole.instructions} emptyText={t('systemInstructions.noAdditional')} />
        ) : null}
      </div>
    </Card>
  );
});
