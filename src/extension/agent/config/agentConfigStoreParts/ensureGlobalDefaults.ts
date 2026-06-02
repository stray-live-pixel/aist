import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_GLOBAL_INSTRUCTIONS } from './DEFAULT_GLOBAL_INSTRUCTIONS';
import { DEFAULT_GLOBAL_MODES } from './DEFAULT_GLOBAL_MODES';
import { DEFAULT_PRESETS } from './DEFAULT_PRESETS';
import { getGlobalConfigPath } from './getGlobalConfigPath';

export function ensureGlobalDefaults(): void {
  const filePath = getGlobalConfigPath();
  if (fs.existsSync(filePath)) return;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${JSON.stringify(
      {
        instructions: DEFAULT_GLOBAL_INSTRUCTIONS,
        modes: DEFAULT_GLOBAL_MODES,
        presets: DEFAULT_PRESETS
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}
