import { StoredAgentConfig } from './StoredAgentConfig';
import { ensureGlobalDefaults } from './ensureGlobalDefaults';
import { getGlobalConfigPath } from './getGlobalConfigPath';
import { readJsonConfig } from './readJsonConfig';

export function readGlobalAgentConfig(): StoredAgentConfig {
  ensureGlobalDefaults();
  return readJsonConfig(getGlobalConfigPath());
}
