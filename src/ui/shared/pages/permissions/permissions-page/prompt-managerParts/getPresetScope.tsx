import { type AgentItemScope, type AgentPromptPreset } from '../../../../types';

export function getPresetScope(preset: AgentPromptPreset): AgentItemScope {
  return preset.scope || 'local';
}
