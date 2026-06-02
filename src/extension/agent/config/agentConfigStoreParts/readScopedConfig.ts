import { AgentItemScope } from './AgentItemScope';
import { StoredAgentConfig } from './StoredAgentConfig';
import { readAgentConfig } from './readAgentConfig';
import { readGlobalAgentConfig } from './readGlobalAgentConfig';

export function readScopedConfig(scope: AgentItemScope): StoredAgentConfig {
  return scope === 'global' ? readGlobalAgentConfig() : readAgentConfig();
}
