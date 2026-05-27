import { Brain, FileText, RadioTower, X } from 'lucide-react';
import { memo, useEffect } from 'react';

import { ModelSelect, PermissionPresetSelect } from '../../features';
import { useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import { useAgentState } from '../../shared/lib/agentState';
import type { AgentState, EditorContextMode, ReasoningEffort } from '../../shared/types';
import { ModalBackdrop, ModalHeader, ModalSurface } from '../../shared/ui';
import { IconButton } from '../../shared/ui/IconButton';
import { PermissionsPage } from '../permissions/PermissionsPage';
import type { SettingsPageId } from '../permissions/permissions-page/types';
import styles from './ChatPage.module.scss';

type AgentSettingsModalProps = {
  onClose(): void;
  initialPage?: SettingsPageId;
};

/**
 * Что это: модалка полной настройки агента поверх чата.
 * Зачем нужно: быстрые настройки остаются в header, а глубокие разделы открываются embedded-версией PermissionsPage.
 */
export function AgentSettingsModal({ onClose, initialPage = 'overview' }: AgentSettingsModalProps) {
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
        <PermissionsPage variant="embedded" initialPage={initialPage} />
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
        <EditorContextModeSelect value={state.editorContextMode} disabled={state.activeChat.busy} />
        <StreamingToggle enabled={state.streamingEnabled} disabled={state.activeChat.busy} />
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

const EditorContextModeSelect = memo(function EditorContextModeSelect({
  value,
  disabled
}: {
  value: EditorContextMode;
  disabled: boolean;
}) {
  const { t } = useI18n();

  return (
    <label className={styles.reasoningField}>
      <span className={styles.reasoningLabel}>
        <FileText size={14} className={styles.reasoningIcon} />
        <span>{t('settings.editorContextTitle')}</span>
      </span>
      <select
        className={styles.reasoningSelect}
        value={value}
        disabled={disabled}
        onChange={(event) => agentActions.setEditorContextMode(event.target.value as EditorContextMode)}
      >
        <option value="auto">{t('editorContext.auto')}</option>
        <option value="selection">{t('editorContext.selection')}</option>
        <option value="file">{t('editorContext.file')}</option>
        <option value="off">{t('editorContext.off')}</option>
      </select>
    </label>
  );
});

const StreamingToggle = memo(function StreamingToggle({ enabled, disabled }: { enabled: boolean; disabled: boolean }) {
  const { t } = useI18n();

  return (
    <label className={styles.streamingField}>
      <span className={styles.reasoningLabel}>
        <RadioTower size={14} className={styles.reasoningIcon} />
        <span>{t('settings.streamingTitle')}</span>
      </span>
      <span className={styles.streamingControlRow}>
        <input
          className={styles.streamingCheckbox}
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(event) => agentActions.setStreamingEnabled(event.target.checked)}
        />
        <span>{enabled ? t('settings.streamingOn') : t('settings.streamingOff')}</span>
      </span>
      <span className={styles.streamingDescription}>{t('settings.streamingDescription')}</span>
    </label>
  );
});
