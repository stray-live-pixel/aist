import path from 'node:path';

import { createToolError } from '../../../shared/lib/toolErrors';
import { assertRealPathInsideWorkspace } from './assertRealPathInsideWorkspace';
import { getWorkspace } from './getWorkspace';
import { isPathInsideOrSame } from './isPathInsideOrSame';
import type { NodeFilesystemToolContext } from './nodeFilesystemToolContext';
import { normalizeWorkspaceRelativePath } from './normalizeWorkspaceRelativePath';
import type { ResolvedWorkspacePath } from './resolvedWorkspacePath';

/**
 * Превращает путь модели в безопасный абсолютный путь внутри workspace.
 *
 * Это главный защитный шлюз fs-домена: он нормализует относительный путь,
 * запрещает выход за пределы проекта и проверяет realpath, чтобы symlink не
 * позволил прочитать или изменить чужие файлы на компьютере пользователя.
 */
export async function resolveWorkspacePath({
  context,
  relativePath,
  options
}: {
  context: NodeFilesystemToolContext;
  relativePath: string;
  options: { allowMissing: boolean };
}): Promise<ResolvedWorkspacePath> {
  const workspace = await getWorkspace({ context });
  const normalizedRelativePath = normalizeWorkspaceRelativePath({ relativePath });
  const absolutePath = path.resolve(workspace.rootPath, normalizedRelativePath === '.' ? '' : normalizedRelativePath);

  if (!isPathInsideOrSame({ rootPath: workspace.rootPath, filePath: absolutePath })) {
    throw createToolError('PATH_OUTSIDE_WORKSPACE', `Path is outside the workspace: ${relativePath}`, {
      path: relativePath
    });
  }

  await assertRealPathInsideWorkspace({
    rootPath: workspace.rootPath,
    absolutePath,
    inputPath: relativePath,
    allowMissing: options.allowMissing
  });

  return {
    absolutePath,
    relativePath: normalizedRelativePath
  };
}
