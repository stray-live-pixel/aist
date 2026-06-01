import fs from 'node:fs';

import { StoredAgentConfig } from './StoredAgentConfig';

export function readJsonConfig(filePath: string): StoredAgentConfig {
  if (!fs.existsSync(filePath)) return {};

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as StoredAgentConfig;
  } catch (error) {
    console.error('[aist] Failed to read agent config', error);
    return {};
  }
}
