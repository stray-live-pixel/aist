import { AgentItemRef } from './AgentItemRef';
import { readAgentConfig } from './readAgentConfig';
import { updateAgentConfig } from './updateAgentConfig';

export async function setActivePromptConfig(input: {
  instructionRefs: AgentItemRef[];
  modeRef?: AgentItemRef;
  presetId?: string;
}): Promise<void> {
  const localConfig = readAgentConfig();
  await updateAgentConfig({
    ...localConfig,
    activeInstructionRefs: input.instructionRefs,
    activeModeRef: input.modeRef,
    activePresetId: input.presetId
  });
}
