import { Brain, Coins, Gauge, Settings2, ShieldCheck, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';

import type { AgentState, ChatContextEstimate } from '../../shared/types';

type AgentSettingsSummaryProps = {
  state: AgentState;
  onOpen(): void;
};

export function AgentSettingsSummary({ state, onOpen }: AgentSettingsSummaryProps) {
  const modeLabel = state.agentModes.find((mode) => mode.id === state.agentMode)?.label || state.agentMode;
  const presetLabel = getPermissionPresetLabel(state);

  return (
    <button
      type="button"
      className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded px-1 py-1 text-left text-[11px] leading-4 text-[var(--vscode-descriptionForeground)] outline-none hover:bg-[var(--vscode-list-hoverBackground)] focus:border-[var(--vscode-focusBorder)]"
      title="Open agent settings"
      onClick={onOpen}
    >
      <SummaryItem icon={<Settings2 size={12} />} text={`Mode: ${modeLabel}`} />
      <SummaryItem icon={<ShieldCheck size={12} />} text={presetLabel} />
      <SummaryItem icon={<Brain size={12} />} text={`Reasoning: ${state.reasoningEffort}`} />
      <SummaryItem icon={<Wrench size={12} />} text={`${state.tools.length} tools`} />
      <SummaryItem icon={<Gauge size={12} />} text={`Context: ${formatContextFill(state.activeChat.context)}`} />
      {state.activeChat.usage.costUsd !== undefined ? (
        <SummaryItem icon={<Coins size={12} />} text={`Cost: ${formatCost(state.activeChat.usage.costUsd)}`} />
      ) : null}
    </button>
  );
}

function SummaryItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{text}</span>
    </span>
  );
}

function getPermissionPresetLabel(state: AgentState): string {
  if (state.activeToolPermissionPresetId === 'custom') {
    return 'Custom permissions';
  }

  return (
    state.toolPermissionPresets.find((preset) => preset.id === state.activeToolPermissionPresetId)?.label ||
    'Permissions'
  );
}

function formatContextFill(context: ChatContextEstimate | undefined): string {
  if (!context) {
    return 'n/a';
  }

  const tokens = formatTokens(context.tokens);
  const percent = context.percent !== undefined ? ` (${Math.round(context.percent)}%)` : '';

  if (!context.maxTokens) {
    return `${tokens}${percent}`;
  }

  return `${tokens}/${formatTokens(context.maxTokens)}${percent}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }

  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }

  return String(tokens);
}

function formatCost(costUsd: number): string {
  if (costUsd === 0) {
    return '$0.00';
  }

  if (costUsd < 0.0001) {
    return `~$${costUsd.toFixed(6)}`;
  }

  return `~$${costUsd.toFixed(4)}`;
}
