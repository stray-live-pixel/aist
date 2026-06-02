import { StoredAgentConfig } from './StoredAgentConfig';
import { getWorkspaceConfigPath } from './getWorkspaceConfigPath';
import { readJsonConfig } from './readJsonConfig';

export function readAgentConfig(): StoredAgentConfig {
  return readJsonConfig(getWorkspaceConfigPath());
}
