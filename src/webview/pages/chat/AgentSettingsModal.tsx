import { Brain, X } from 'lucide-react';
import { memo, useEffect } from 'react';

import { ModelSelect, PermissionPresetSelect } from '../../features';
import { useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import { useAgentState } from '../../shared/lib/agentState';
import type { AgentState, ReasoningEffort } from '../../shared/types';
import { ModalBackdrop, ModalHeader, ModalSurface } from '../../shared/ui';
import { IconButton } from '../../shared/ui/IconButton';
import { PermissionsPage } from '../permissions/PermissionsPage';
import styles from './ChatPage.module.scss';

type AgentSettingsModalProps = {
  onClose(): void;
};

/**
 * Что это: модалка полной настройки агента поверх чата.
 * Зачем нужно: быстрые настройки остаются в header, а глубокие разделы открываются embedded-версией PermissionsPage.
 */
export function AgentSettingsModal({ onClose }: AgentSettingsModalProps) {
  const { t } = useI18n();
  const state = useAgentState();
  useEffect(() => {
    const closeByEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', closeByEscape);
    return () => document.removeEventListener('keydown', closeByEscape);
  }, [onClose]);

  return (
    <ModalBackdrop role="presentation" onMouseDown={onClose}>
      <ModalSurface size="settings" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <ModalHeader>
          <div>
            <h2>{t('settings.title')}</h2>
            <p>{t('settings.modalDescription')}</p>
          </div>
          <IconButton title={t('common.closeSettings')} onClick={onClose}>
            <X size={15} />
          </IconButton>
        </ModalHeader>
        <div className={styles.quickSettingsWrap}>
          <QuickSettings state={state} />
        </div>
        <PermissionsPage variant="embedded" />
      </ModalSurface>
    </ModalBackdrop>
  );
}

const QuickSettings = memo(function QuickSettings({ state }: { state: AgentState }) {
  const { t } = useI18n();

  return (
    <section className={styles.quickSettings}>
      <div>
        <h3 className={styles.quickSettingsTitle}>{t('settings.requestTitle')}</h3>
        <p className={styles.quickSettingsDescription}>{t('settings.requestDescription')}</p>
      </div>
      <div className={styles.quickSettingsGrid}>
        <ModelSelect model={state.activeChat.model} models={state.models} disabled={state.activeChat.busy} />
        <PermissionPresetSelect
          presets={state.toolPermissionPresets}
          activeId={state.activeToolPermissionPresetId}
          disabled={state.activeChat.busy}
        />
        <ReasoningSelect value={state.reasoningEffort} disabled={state.activeChat.busy} />
      </div>
    </section>
  );
});

const ReasoningSelect = memo(function ReasoningSelect({
  value,
  disabled
}: {
  value: ReasoningEffort;
  disabled: boolean;
}) {
  const { t } = useI18n();

  return (
    <label className={styles.reasoningField}>
      <span className={styles.reasoningLabel}>
        <Brain size={14} className={styles.reasoningIcon} />
        <span>{t('summary.reasoningEffort')}</span>
      </span>
      <select
        className={styles.reasoningSelect}
        value={value}
        disabled={disabled}
        onChange={(event) => agentActions.setReasoningEffort(event.target.value as ReasoningEffort)}
      >
        <option value="auto">{t('reasoning.auto')}</option>
        <option value="low">{t('reasoning.low')}</option>
        <option value="medium">{t('reasoning.medium')}</option>
        <option value="high">{t('reasoning.high')}</option>
      </select>
    </label>
  );
});
