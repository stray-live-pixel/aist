import { Brain, Gauge, Settings2, ShieldCheck, Wrench } from 'lucide-react';

import type { AgentState } from '../../shared/types';

type AgentSettingsSummaryProps = {
  state: AgentState;
  onOpen(): void;
};

export function AgentSettingsSummary({ state, onOpen }: AgentSettingsSummaryProps) {
  const modeLabel = state.agentModes.find((mode) => mode.id === state.agentMode)?.label || state.agentMode;
  const presetLabel =
    state.activeToolPermissionPresetId === 'custom'
      ? 'Custom permissions'
      : state.toolPermissionPresets.find((preset) => preset.id === state.activeToolPermissionPresetId)?.label ||
        'Permissions';

  return (
    <button
      type="button"
      className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded px-1 py-1 text-left text-[11px] leading-4 text-[var(--vscode-descriptionForeground)] outline-none hover:bg-[var(--vscode-list-hoverBackground)] focus:border-[var(--vscode-focusBorder)]"
      title="Open agent settings"
      onClick={onOpen}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <Settings2 size={12} className="shrink-0" />
        <span className="truncate">Mode: {modeLabel}</span>
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <ShieldCheck size={12} className="shrink-0" />
        <span className="truncate">{presetLabel}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Brain size={12} />
        <span>Reasoning: {state.reasoningEffort}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Wrench size={12} />
        <span>{state.tools.length} tools</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Gauge size={12} />
        <span>Limit: {state.maxToolIterations || 'none'}</span>
      </span>
    </button>
  );
}
