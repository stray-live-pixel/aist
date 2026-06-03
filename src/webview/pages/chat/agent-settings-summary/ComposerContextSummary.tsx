import { Coins, ShieldCheck } from 'lucide-react';
import { memo, useMemo } from 'react';

import { useI18n } from '../../../shared/i18n';
import { agentActions } from '../../../shared/lib/agentActions';
import type { AgentState } from '../../../shared/types';
import { CompactControlGroup, CompactControlItem, Select } from '../../../shared/ui';
import styles from '../ChatPage.module.scss';
import { ToolCallNotesToggleButton } from './ToolCallNotesToggleButton';
import { formatCost, getPermissionDisplayLabels } from './formatters';
import { usePermissionOptions } from './usePermissionOptions';

/**
 * Что это: нижняя строка быстрых controls composer.
 * Зачем нужно: оставляет внизу часто меняемые разрешения и короткие метаданные.
 * Какую проблему решает: поле ввода не перегружается модельными настройками и подробными панелями.
 */
export const ComposerContextSummary = memo(function ComposerContextSummary({
  state,
  modelControl
}: {
  state: AgentState;
  modelControl?: React.ReactNode;
}) {
  const { t } = useI18n();
  const permissionOptions = usePermissionOptions({ state, t });
  const permissionDisplayLabels = useMemo(
    () =>
      getPermissionDisplayLabels({ options: permissionOptions, activePresetId: state.activeToolPermissionPresetId }),
    [permissionOptions, state.activeToolPermissionPresetId]
  );

  return (
    <CompactControlGroup className={styles.contextSummaryRoot}>
      {modelControl ? <div className={styles.modelSummarySlot}>{modelControl}</div> : null}
      <Select
        className={`${styles.compactSelect} ${styles.permissionsCompactSelect}`}
        size="sm"
        leadingIcon={<ShieldCheck size={12} />}
        aria-label={t('summary.toolPermissionPreset')}
        title={t('summary.toolPermissionPreset')}
        value={state.activeToolPermissionPresetId}
        onChange={(event) => agentActions.setToolPermissionPreset(event.target.value)}
        options={permissionOptions}
        displayLabels={permissionDisplayLabels}
      />
      <ToolCallNotesToggleButton required={state.toolCallNotesRequired} />
      {state.activeChat.usage.costUsd !== undefined ? (
        <CompactControlItem
          icon={<Coins size={12} />}
          text={t('summary.cost', { cost: formatCost({ costUsd: state.activeChat.usage.costUsd }) })}
        />
      ) : null}
    </CompactControlGroup>
  );
});
