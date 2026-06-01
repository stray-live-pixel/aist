import { AgentItemScope } from './AgentItemScope';
import { StoredAgentConfig } from './StoredAgentConfig';
import { getGlobalConfigPath } from './getGlobalConfigPath';
import { getWorkspaceConfigPath } from './getWorkspaceConfigPath';
import { writeJsonConfig } from './writeJsonConfig';

export async function writeScopedConfig(scope: AgentItemScope, config: StoredAgentConfig): Promise<void> {
  await writeJsonConfig(scope === 'global' ? getGlobalConfigPath() : getWorkspaceConfigPath(), config);
}
