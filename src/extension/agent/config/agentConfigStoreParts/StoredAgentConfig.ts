import { type AuxiliaryModelsSettings } from '../auxiliaryModels';
import { type CompactionSettings } from '../compaction';
import { type AgentMode } from '../settings';
import { AgentItemRef } from './AgentItemRef';
import { AgentPromptPreset } from './AgentPromptPreset';
import { StoredInstructionItem } from './StoredInstructionItem';
import { StoredModeItem } from './StoredModeItem';
import { StoredSkillItem } from './StoredSkillItem';

export type StoredAgentConfig = {
  projectInstructions?: string;
  customModes?: AgentMode[];
  modeInstructions?: Record<string, string>;
  customSkills?: StoredSkillItem[];
  compaction?: Partial<CompactionSettings>;
  auxiliaryModels?: Partial<AuxiliaryModelsSettings>;
  instructions?: StoredInstructionItem[];
  modes?: StoredModeItem[];
  presets?: AgentPromptPreset[];
  activeInstructionRefs?: AgentItemRef[];
  activeModeRef?: AgentItemRef;
  activePresetId?: string;
};
