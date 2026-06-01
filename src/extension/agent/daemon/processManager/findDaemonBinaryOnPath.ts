import path from 'node:path';

/**
 * Что это: ищет исполняемый файл daemon CLI в PATH пользователя.
 * Зачем нужно: extension может работать с установленным aist без bundled binary.
 * Какую проблему решает: поиск PATH изолирован от lifecycle manager и проще тестируется.
 */
export function findDaemonBinaryOnPath({
  binaryName,
  existsSync
}: {
  binaryName: string;
  existsSync(filePath: string): boolean;
}): string | undefined {
  const pathValue = process.env.PATH || '';
  const suffixes = process.platform === 'win32' ? ['.cmd', '.exe', ''] : [''];
  for (const directory of pathValue.split(path.delimiter)) {
    for (const suffix of suffixes) {
      const candidate = path.join(directory, `${binaryName}${suffix}`);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}
