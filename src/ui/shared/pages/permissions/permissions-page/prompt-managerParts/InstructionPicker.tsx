import { memo } from 'react';

import { useI18n } from '../../../../shared/i18n';
import { type AgentInstructionItem, type AgentItemRef } from '../../../../shared/types';
import { Checkbox } from '../../../../shared/ui';
import styles from '../../PermissionsPage.module.scss';
import { refKey, scopeLabel } from '../utils';

export const InstructionPicker = memo(function InstructionPicker({
  title,
  instructions,
  selectedRefKeys,
  onToggle
}: {
  title: string;
  instructions: AgentInstructionItem[];
  selectedRefKeys: Set<string>;
  onToggle(ref: AgentItemRef, checked: boolean): void;
}) {
  const { t } = useI18n();

  return (
    <div className={styles.formGrid}>
      <div className={styles.sidebarTitle}>{title}</div>
      <div className={styles.list}>
        {instructions.map((instruction) => {
          const ref = { scope: instruction.scope, id: instruction.id };
          return (
            <Checkbox
              key={refKey(ref)}
              label={`${scopeLabel(instruction.scope, t)} · ${instruction.label}`}
              description={instruction.content.slice(0, 160)}
              checked={selectedRefKeys.has(refKey(ref))}
              onChange={(event) => onToggle(ref, event.target.checked)}
            />
          );
        })}
        {!instructions.length ? <p className={styles.empty}>{t('settings.promptManager.noInstructions')}</p> : null}
      </div>
    </div>
  );
});
