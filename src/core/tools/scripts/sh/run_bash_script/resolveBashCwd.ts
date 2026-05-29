import fs from 'node:fs';

import { createToolError } from '../../../../shared/lib/toolErrors';
import type { NodeFilesystemToolContext } from '../../../fs/shared/nodeFilesystemToolContext';
import { resolveWorkspacePath } from '../../../fs/shared/resolveWorkspacePath';

/**
 * Разрешает рабочую директорию Bash-команды внутри workspace.
 *
 * По умолчанию команда запускается из корня проекта. Если модель передала cwd,
 * он должен существовать, быть директорией и не выходить за пределы workspace.
 */
export async function resolveBashCwd({
  context,
  cwd
}: {
  context: NodeFilesystemToolContext;
  cwd: string;
}): Promise<{ cwd: string; absolutePath: string }> {
  const cwdPath = await resolveWorkspacePath({ context, relativePath: cwd, options: { allowMissing: false } });
  const stat = await fs.promises.stat(cwdPath.absolutePath);

  if (!stat.isDirectory()) {
    throw createToolError('NOT_A_DIRECTORY', `cwd must point to a workspace directory: ${cwd}`, { cwd });
  }

  return {
    cwd,
    absolutePath: cwdPath.absolutePath
  };
}
