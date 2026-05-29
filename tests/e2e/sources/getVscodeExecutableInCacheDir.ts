import path from 'node:path';

/**
 * Что это: возвращает путь к executable внутри распакованного VS Code cache.
 * Зачем нужно: структура приложения отличается на macOS, Windows и Linux, а e2e launcher должен получать готовый binary path.
 */
export function getVscodeExecutableInCacheDir({ cacheDir }: { cacheDir: string }): string {
  if (process.platform === 'darwin') {
    return path.join(cacheDir, 'Visual Studio Code.app', 'Contents', 'MacOS', 'Electron');
  }

  if (process.platform === 'win32') {
    return path.join(cacheDir, 'Code.exe');
  }

  return path.join(cacheDir, 'VSCode-linux-x64', 'code');
}
