import { getGlobalConfigPath } from './getGlobalConfigPath';
import { getWorkspaceConfigPath } from './getWorkspaceConfigPath';
import { normalizePresets } from './normalizePresets';
import { readAgentConfig } from './readAgentConfig';
import { readGlobalAgentConfig } from './readGlobalAgentConfig';
import { writeJsonConfig } from './writeJsonConfig';

export async function deletePromptPreset(presetId: string): Promise<void> {
  const localConfig = readAgentConfig();
  const globalConfig = readGlobalAgentConfig();
  await writeJsonConfig(getWorkspaceConfigPath(), {
    ...localConfig,
    presets: normalizePresets(localConfig.presets || [], 'local').filter((item) => item.id !== presetId),
    activePresetId: localConfig.activePresetId === presetId ? undefined : localConfig.activePresetId
  });
  await writeJsonConfig(getGlobalConfigPath(), {
    ...globalConfig,
    presets: normalizePresets(globalConfig.presets || [], 'global').filter((item) => item.id !== presetId)
  });
}
