import path from 'node:path';

/**
 * Проверяет, что файл находится внутри workspace или совпадает с его корнем.
 *
 * Так инструменты не читают и не изменяют файлы за пределами проекта, даже если
 * модель попробует передать относительный путь с выходом наверх.
 */
export function isPathInsideOrSame({ rootPath, filePath }: { rootPath: string; filePath: string }): boolean {
  const relativePath = path.relative(rootPath, filePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}
