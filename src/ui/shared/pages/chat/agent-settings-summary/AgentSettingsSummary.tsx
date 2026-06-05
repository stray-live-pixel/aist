import { FileText } from 'lucide-react';
import { memo } from 'react';

import { useI18n } from '../../../shared/i18n';
import type { AgentState } from '../../../shared/types';
import { CompactControlGroup, CompactNavigationButton } from '../../../shared/ui';
import type { SettingsPageId } from '../../permissions/permissions-page/types';
import styles from '../ChatPage.module.scss';
import { ComposerContextControls } from './ComposerContextControls';
import { formatInstructionProfileLabel, getActivePresetLabel, getActiveRoleLabel } from './instructionProfile';

/**
 * Что это: props компактной панели быстрых настроек над composer.
 * Зачем нужно: компоненту нужны состояние агента, дополнительные actions и переход в settings.
 * Какую проблему решает: контракт summary остаётся явным после разбиения файла.
 */
type AgentSettingsSummaryProps = {
  state: AgentState;
  actions?: React.ReactNode;
  onOpen(page?: SettingsPageId): void;
};

/**
 * Что это: компактная панель быстрых настроек над composer.
 * Зачем нужно: позволяет менять режим, preset доступа и видеть контекст без открытия полной модалки settings.
 * Какую проблему решает: основные настройки агента остаются видимыми, но не перегружают composer.
 */
export const AgentSettingsSummary = memo(function AgentSettingsSummary({
  state,
  actions,
  onOpen
}: AgentSettingsSummaryProps) {
  const { t } = useI18n();
  const activeRoleLabel = getActiveRoleLabel({ state, fallback: t('systemInstructions.noRole') });
  const activePresetLabel = getActivePresetLabel({ state, fallback: t('settings.promptManager.noActivePreset') });
  const instructionCount = state.promptConfig.activeInstructionRefs.length;
  const profileLabel = formatInstructionProfileLabel({
    role: activeRoleLabel,
    preset: activePresetLabel,
    instructionCount
  });
  const profileTitle = `${t('summary.agentMode')}: ${activeRoleLabel}\n${t(
    'settings.promptManager.activePresetTitle'
  )}: ${activePresetLabel}\n${t('common.instructions')}: ${instructionCount}`;

  return (
    <CompactControlGroup className={styles.summaryRoot}>
      <ComposerContextControls state={state} />
      <CompactNavigationButton
        className={styles.profileSummaryButton}
        icon={<FileText size={12} />}
        title={profileTitle}
        label={profileLabel}
        onClick={() => onOpen('presets')}
      />
      {actions ? <div className={styles.summaryActions}>{actions}</div> : null}
    </CompactControlGroup>
  );
});
