import { AgentInstructionItem } from './AgentInstructionItem';
import { AgentItemRef } from './AgentItemRef';
import { AgentModeItem } from './AgentModeItem';
import { AgentPromptPreset } from './AgentPromptPreset';

export type AgentPromptConfig = {
  globalInstructions: AgentInstructionItem[];
  localInstructions: AgentInstructionItem[];
  globalModes: AgentModeItem[];
  localModes: AgentModeItem[];
  presets: AgentPromptPreset[];
  activeInstructionRefs: AgentItemRef[];
  activeModeRef?: AgentItemRef;
  activePresetId?: string;
};
