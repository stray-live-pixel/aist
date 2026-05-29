import fs from 'node:fs/promises';
import path from 'node:path';

import { getVscodeExecutableInCacheDir } from './getVscodeExecutableInCacheDir';
import { getVscodeTestPlatform } from './getVscodeTestPlatform';

/**
 * Что это: ищет готовый VS Code executable в локальном .vscode-test cache.
 * Зачем нужно: e2e не должен повторно скачивать VS Code, если версия уже была установлена один раз.
 */
export async function findCachedVscodeExecutable({ cachePath }: { cachePath: string }): Promise<string | undefined> {
  const platform = getVscodeTestPlatform();
  const entries = await fs.readdir(cachePath, { withFileTypes: true }).catch(() => []);
  const candidates = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(`vscode-${platform}-`))
    .map((entry) => path.join(cachePath, entry.name))
    .sort()
    .reverse();

  for (const candidate of candidates) {
    const marker = path.join(candidate, 'is-complete');
    const executable = getVscodeExecutableInCacheDir({ cacheDir: candidate });
    const [markerExists, executableExists] = await Promise.all([
      exists({ path: marker }),
      exists({ path: executable })
    ]);

    if (markerExists && executableExists) {
      return executable;
    }
  }

  return undefined;
}

async function exists({ path }: { path: string }): Promise<boolean> {
  return fs
    .access(path)
    .then(() => true)
    .catch(() => false);
}
