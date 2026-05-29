import fs from 'node:fs';
import path from 'node:path';

import { createToolError } from '../../../shared/lib/toolErrors';
import { findNearestExistingParent } from './findNearestExistingParent';
import { isNotFoundError } from './isNotFoundError';
import { isPathInsideOrSame } from './isPathInsideOrSame';

/**
 * Проверяет, что реальный путь файла не выходит из workspace.
 *
 * Сначала проверяется сам путь. Если файла ещё нет, проверяется ближайшая
 * существующая родительская директория — так мы не пропускаем запись через
 * symlink-папку наружу проекта.
 */
export async function assertRealPathInsideWorkspace({
  rootPath,
  absolutePath,
  inputPath,
  allowMissing
}: {
  rootPath: string;
  absolutePath: string;
  inputPath: string;
  allowMissing: boolean;
}): Promise<void> {
  let missingError: unknown;
  try {
    const realPath = await fs.promises.realpath(absolutePath);
    if (!isPathInsideOrSame({ rootPath, filePath: realPath })) {
      throw createToolError('PATH_OUTSIDE_WORKSPACE', `Path is outside the workspace: ${inputPath}`, {
        path: inputPath
      });
    }
    return;
  } catch (error) {
    if (!isNotFoundError({ error })) {
      throw error;
    }

    missingError = error;
  }

  const nearestParent = await findNearestExistingParent({ startPath: path.dirname(absolutePath) });
  const realParent = await fs.promises.realpath(nearestParent);
  if (!isPathInsideOrSame({ rootPath, filePath: realParent })) {
    throw createToolError('PATH_OUTSIDE_WORKSPACE', `Path is outside the workspace: ${inputPath}`, {
      path: inputPath
    });
  }

  if (!allowMissing) {
    throw missingError;
  }
}
