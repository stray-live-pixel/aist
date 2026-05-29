import path from 'node:path';

/**
 * Превращает абсолютный путь файла в стабильный workspace-relative путь.
 *
 * Модель и пользователь должны видеть одинаковые пути на macOS, Linux и Windows,
 * поэтому разделители нормализуются к POSIX-формату через slash.
 */
export function toWorkspaceRelativePath({
  rootPath,
  absolutePath
}: {
  rootPath: string;
  absolutePath: string;
}): string {
  return path.relative(rootPath, absolutePath).replace(/\\/g, '/');
}
