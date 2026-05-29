import fs from 'node:fs';
import path from 'node:path';

import { isNotFoundError } from './isNotFoundError';

/**
 * Находит ближайшую существующую родительскую директорию для будущего файла.
 *
 * Это важно для операций с ещё не созданными путями: мы проверяем realpath
 * ближайшего родителя и не позволяем создать файл через symlink за пределами
 * workspace.
 */
export async function findNearestExistingParent({ startPath }: { startPath: string }): Promise<string> {
  let currentPath = startPath;

  while (true) {
    try {
      const stat = await fs.promises.stat(currentPath);
      if (stat.isDirectory()) {
        return currentPath;
      }
    } catch (error) {
      // ENOENT означает, что поднимаемся выше; другие ошибки должны увидеть вызывающие инструменты.
      if (!isNotFoundError({ error })) {
        throw error;
      }
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      return currentPath;
    }
    currentPath = parentPath;
  }
}
