import { AgentItemScope } from './AgentItemScope';
import { AgentPromptPreset } from './AgentPromptPreset';
import { createUniqueId } from './createUniqueId';
import { normalizePresets } from './normalizePresets';
import { readScopedConfig } from './readScopedConfig';
import { writeScopedConfig } from './writeScopedConfig';

export async function upsertPromptPreset(
  input: Omit<AgentPromptPreset, 'id' | 'scope'> & { id?: string; scope?: AgentItemScope }
): Promise<void> {
  const scope = input.scope || 'local';
  const config = readScopedConfig(scope);
  const current = normalizePresets(config.presets || [], scope);
  const id =
    input.id ||
    createUniqueId(
      input.label,
      current.map((preset) => preset.id)
    );
  const preset: AgentPromptPreset = {
    id,
    label: input.label.trim() || 'Preset',
    instructionRefs: input.instructionRefs || [],
    modeRef: input.modeRef,
    scope
  };
  const next = current.some((item) => item.id === id)
    ? current.map((item) => (item.id === id ? preset : item))
    : [...current, preset];
  await writeScopedConfig(scope, { ...config, presets: next });
}
