import { AgentPromptConfig } from './AgentPromptConfig';
import { ensureGlobalDefaults } from './ensureGlobalDefaults';
import { normalizeInstructions } from './normalizeInstructions';
import { normalizeModeRef } from './normalizeModeRef';
import { normalizeModes } from './normalizeModes';
import { normalizePresets } from './normalizePresets';
import { normalizeRefs } from './normalizeRefs';
import { readAgentConfig } from './readAgentConfig';
import { readGlobalAgentConfig } from './readGlobalAgentConfig';

export function getPromptConfig(): AgentPromptConfig {
  ensureGlobalDefaults();
  const globalConfig = readGlobalAgentConfig();
  const localConfig = readAgentConfig();
  const globalInstructions = normalizeInstructions(globalConfig.instructions, 'global');
  const localInstructions = normalizeInstructions(localConfig.instructions, 'local');
  const globalModes = normalizeModes(globalConfig.modes, 'global');
  const localModes = normalizeModes(localConfig.modes, 'local');
  const presets = [
    ...normalizePresets(globalConfig.presets || [], 'global'),
    ...normalizePresets(localConfig.presets || [], 'local')
  ];
  const fallbackPreset = presets[0];

  return {
    globalInstructions,
    localInstructions,
    globalModes,
    localModes,
    presets,
    activeInstructionRefs: normalizeRefs(
      localConfig.activeInstructionRefs || fallbackPreset?.instructionRefs || [],
      globalInstructions,
      localInstructions
    ),
    activeModeRef: normalizeModeRef(localConfig.activeModeRef || fallbackPreset?.modeRef, globalModes, localModes),
    activePresetId: typeof localConfig.activePresetId === 'string' ? localConfig.activePresetId : fallbackPreset?.id
  };
}
