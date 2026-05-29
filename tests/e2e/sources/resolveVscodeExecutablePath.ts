import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import path from 'node:path';

import { findCachedVscodeExecutable } from './findCachedVscodeExecutable';

const defaultCachePath = path.resolve(__dirname, '../../../.vscode-test');
const extensionPath = path.resolve(__dirname, '../../..');

/**
 * Что это: выбирает executable VS Code для e2e-запуска.
 * Зачем нужно: тесты должны быстро использовать уже скачанный .vscode-test, а сеть нужна только для первичной установки.
 */
export async function resolveVscodeExecutablePath(): Promise<string> {
  if (process.env.VSCODE_E2E_PATH) {
    return process.env.VSCODE_E2E_PATH;
  }

  const cachePath = process.env.VSCODE_E2E_CACHE_PATH || defaultCachePath;
  const cached = await findCachedVscodeExecutable({ cachePath });
  if (cached) {
    return cached;
  }

  return downloadAndUnzipVSCode({
    version: process.env.VSCODE_E2E_VERSION || 'stable',
    cachePath,
    extensionDevelopmentPath: extensionPath
  });
}
