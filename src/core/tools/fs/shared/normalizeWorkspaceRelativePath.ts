import path from 'node:path';

import { createToolError } from '../../../shared/lib/toolErrors';

/**
 * Нормализует путь, который модель передаёт как путь внутри workspace.
 *
 * Функция отсекает абсолютные пути, Windows drive path, null byte и выходы через
 * `..`, чтобы инструмент всегда работал только с файлами текущего проекта.
 */
export function normalizeWorkspaceRelativePath({ relativePath }: { relativePath: string }): string {
  if (typeof relativePath !== 'string' || relativePath.trim() === '') {
    throw createToolError('INVALID_ARGUMENT', 'Workspace-relative path must be a non-empty string.', {
      path: String(relativePath)
    });
  }

  if (relativePath.includes('\0')) {
    throw createToolError('INVALID_ARGUMENT', 'Workspace-relative path contains a null byte.', { path: relativePath });
  }

  if (
    path.isAbsolute(relativePath) ||
    path.posix.isAbsolute(relativePath) ||
    path.win32.isAbsolute(relativePath) ||
    /^[A-Za-z]:/.test(relativePath)
  ) {
    throw createToolError('PATH_OUTSIDE_WORKSPACE', `Path must be workspace-relative: ${relativePath}`, {
      path: relativePath
    });
  }

  const normalized = path.posix.normalize(relativePath.replace(/\\/g, '/'));
  if (!normalized || normalized === '..' || normalized.startsWith('../')) {
    throw createToolError('PATH_OUTSIDE_WORKSPACE', `Path is outside the workspace: ${relativePath}`, {
      path: relativePath
    });
  }

  return normalized;
}
