import { StoredAgentConfig } from './StoredAgentConfig';
import { getGlobalConfigPath } from './getGlobalConfigPath';
import { readGlobalAgentConfig } from './readGlobalAgentConfig';
import { writeJsonConfig } from './writeJsonConfig';

export async function updateGlobalAgentConfig(patch: Partial<StoredAgentConfig>): Promise<void> {
  const globalConfig = readGlobalAgentConfig();
  await writeJsonConfig(getGlobalConfigPath(), { ...globalConfig, ...patch });
}
