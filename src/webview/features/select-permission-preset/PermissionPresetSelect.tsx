import { ShieldCheck } from 'lucide-react';

import { vscode } from '../../shared/lib/vscode';
import type { ToolPermissionPreset, ToolPermissionPresetId } from '../../shared/types';

type PermissionPresetSelectProps = {
  presets: ToolPermissionPreset[];
  activeId: ToolPermissionPresetId | 'custom';
  disabled?: boolean;
  className?: string;
};

export function PermissionPresetSelect({ presets, activeId, disabled, className = '' }: PermissionPresetSelectProps) {
  return (
    <label className={`grid min-w-40 max-w-full gap-1 text-xs text-[var(--vscode-descriptionForeground)] ${className}`}>
      <span className="flex items-center gap-2">
        <ShieldCheck size={14} className="shrink-0" />
        <span>Access</span>
      </span>
      <select
        className="h-8 rounded border border-[var(--agent-input-border)] bg-[var(--vscode-dropdown-background)] px-2 text-xs text-[var(--vscode-dropdown-foreground)] outline-none focus:border-[var(--vscode-focusBorder)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
        value={activeId}
        disabled={disabled}
        title={getSelectedDescription(presets, activeId)}
        onChange={(event) => {
          const presetId = event.target.value;
          if (presetId !== 'custom') {
            vscode.postMessage({ type: 'setToolPermissionPreset', presetId });
          }
        }}
      >
        {activeId === 'custom' ? <option value="custom">Custom</option> : null}
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function getSelectedDescription(presets: ToolPermissionPreset[], activeId: ToolPermissionPresetId | 'custom'): string {
  if (activeId === 'custom') {
    return 'Current permissions do not match a preset.';
  }

  return presets.find((preset) => preset.id === activeId)?.description || '';
}
