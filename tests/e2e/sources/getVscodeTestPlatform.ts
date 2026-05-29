/**
 * Что это: определяет platform id, который @vscode/test-electron использует в .vscode-test cache.
 * Зачем нужно: e2e должен переиспользовать уже скачанный VS Code для текущей ОС и архитектуры.
 */
export function getVscodeTestPlatform(): string {
  if (process.platform === 'darwin') {
    return process.arch === 'arm64' ? 'darwin-arm64' : 'darwin';
  }

  if (process.platform === 'win32') {
    return process.arch === 'arm64' ? 'win32-arm64-archive' : 'win32-x64-archive';
  }

  if (process.arch === 'arm64') {
    return 'linux-arm64';
  }

  if (process.arch === 'arm') {
    return 'linux-armhf';
  }

  return 'linux-x64';
}
