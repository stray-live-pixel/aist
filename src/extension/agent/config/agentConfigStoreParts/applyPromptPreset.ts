import { getPromptConfig } from './getPromptConfig';
import { setActivePromptConfig } from './setActivePromptConfig';

export async function applyPromptPreset(presetId: string): Promise<void> {
  const preset = getPromptConfig().presets.find((item) => item.id === presetId);
  if (!preset) return;
  await setActivePromptConfig({
    instructionRefs: preset.instructionRefs,
    modeRef: preset.modeRef,
    presetId: preset.id
  });
}
