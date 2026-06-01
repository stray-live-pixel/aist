import fs from 'node:fs';
import path from 'node:path';

import { StoredAgentConfig } from './StoredAgentConfig';

export async function writeJsonConfig(filePath: string, config: StoredAgentConfig): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}
