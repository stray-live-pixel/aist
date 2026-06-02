import { StoredAgentConfig } from './StoredAgentConfig';
import { getWorkspaceConfigPath } from './getWorkspaceConfigPath';
import { readAgentConfig } from './readAgentConfig';
import { writeJsonConfig } from './writeJsonConfig';

export async function updateAgentConfig(patch: Partial<StoredAgentConfig>): Promise<void> {
  await writeJsonConfig(getWorkspaceConfigPath(), { ...readAgentConfig(), ...patch });
}
