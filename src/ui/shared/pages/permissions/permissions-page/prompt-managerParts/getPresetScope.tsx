import { type AgentItemScope, type AgentPromptPreset } from '../../../../shared/types';

export function getPresetScope(preset: AgentPromptPreset): AgentItemScope {
  return preset.scope || 'local';
}
