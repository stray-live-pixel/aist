import { AgentItemScope } from './AgentItemScope';
import { AgentPromptPreset } from './AgentPromptPreset';
import { normalizeItemRef } from './normalizeItemRef';
import { normalizeItemRefs } from './normalizeItemRefs';

export function normalizePresets(raw: unknown, fallbackScope: AgentItemScope): AgentPromptPreset[] {
  if (!Array.isArray(raw)) return [];
  const used = new Set<string>();
  const presets: AgentPromptPreset[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : '';
    const label = typeof record.label === 'string' ? record.label : '';
    if (!id || !label || used.has(id)) continue;
    used.add(id);
    presets.push({
      id,
      label,
      instructionRefs: Array.isArray(record.instructionRefs) ? normalizeItemRefs(record.instructionRefs) : [],
      modeRef: normalizeItemRef(record.modeRef),
      scope: record.scope === 'global' || record.scope === 'local' ? record.scope : fallbackScope
    });
  }
  return presets;
}
