import { Brain, X } from 'lucide-react';
import { useEffect } from 'react';

import { ModelSelect } from '../../features/select-model/ModelSelect';
import { PermissionPresetSelect } from '../../features/select-permission-preset/PermissionPresetSelect';
import { useI18n } from '../../shared/i18n';
import { vscode } from '../../shared/lib/vscode';
import type { AgentState, ReasoningEffort } from '../../shared/types';
import { IconButton } from '../../shared/ui/IconButton';
import { PermissionsPage } from '../permissions/PermissionsPage';

type AgentSettingsModalProps = {
  state: AgentState;
  onClose(): void;
};

export function AgentSettingsModal({ state, onClose }: AgentSettingsModalProps) {
  const { t } = useI18n();
  useEffect(() => {
    const closeByEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', closeByEscape);
    return () => document.removeEventListener('keydown', closeByEscape);
  }, [onClose]);

  return (
    <div className="tool-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="tool-modal agent-settings-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="tool-modal-header">
          <div>
            <h2>{t('settings.title')}</h2>
            <p>{t('settings.modalDescription')}</p>
          </div>
          <IconButton title={t('common.closeSettings')} onClick={onClose}>
            <X size={15} />
          </IconButton>
        </div>
        <div className="border-b border-[var(--agent-border)] p-3">
          <QuickSettings state={state} />
        </div>
        <PermissionsPage
          tools={state.toolPermissions}
          maxToolIterations={state.maxToolIterations}
          compactionSettings={state.compactionSettings}
          agentLanguage={state.agentLanguage}
          agentMode={state.agentMode}
          agentModes={state.agentModes}
          agentConfigScope={state.agentConfigScope}
          projectInstructions={state.projectInstructions}
          promptConfig={state.promptConfig}
          instructionSources={state.instructionSources}
          customSkills={state.customSkills}
          codexAuthenticated={state.codexAuthenticated}
          permissionPresets={state.toolPermissionPresets}
          activePermissionPresetId={state.activeToolPermissionPresetId}
          variant="embedded"
        />
      </section>
    </div>
  );
}

function QuickSettings({ state }: { state: AgentState }) {
  const { t } = useI18n();

  return (
    <section className="grid gap-3 rounded border border-[var(--agent-input-border)] bg-[var(--vscode-input-background)] p-3">
      <div>
        <h3 className="text-sm font-semibold">{t('settings.requestTitle')}</h3>
        <p className="mt-1 text-xs leading-5 text-[var(--vscode-descriptionForeground)]">
          {t('settings.requestDescription')}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
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
}

function ReasoningSelect({ value, disabled }: { value: ReasoningEffort; disabled: boolean }) {
  const { t } = useI18n();

  return (
    <label className="grid min-w-36 gap-1 text-xs text-[var(--vscode-descriptionForeground)]">
      <span className="flex items-center gap-2">
        <Brain size={14} className="shrink-0" />
        <span>{t('summary.reasoningEffort')}</span>
      </span>
      <select
        className="h-8 rounded border border-[var(--agent-input-border)] bg-[var(--vscode-dropdown-background)] px-2 text-xs text-[var(--vscode-dropdown-foreground)] outline-none focus:border-[var(--vscode-focusBorder)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
        value={value}
        disabled={disabled}
        onChange={(event) =>
          vscode.postMessage({
            type: 'setReasoningEffort',
            reasoningEffort: event.target.value as ReasoningEffort
          })
        }
      >
        <option value="auto">{t('reasoning.auto')}</option>
        <option value="low">{t('reasoning.low')}</option>
        <option value="medium">{t('reasoning.medium')}</option>
        <option value="high">{t('reasoning.high')}</option>
      </select>
    </label>
  );
}
