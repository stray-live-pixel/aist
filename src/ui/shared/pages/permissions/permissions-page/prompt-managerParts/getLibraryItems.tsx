import { type AgentInstructionKind, type AgentItemScope, type AgentPromptConfig } from '../../../../types';

export function getLibraryItems(promptConfig: AgentPromptConfig, scope: AgentItemScope, kind: AgentInstructionKind) {
  if (kind === 'instruction') {
    return scope === 'global' ? promptConfig.globalInstructions : promptConfig.localInstructions;
  }

  return scope === 'global' ? promptConfig.globalModes : promptConfig.localModes;
}
