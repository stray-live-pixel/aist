import fs from 'node:fs';
import path from 'node:path';

import { createToolError } from '../../../shared/lib/toolErrors';
import type { NodeFilesystemToolContext } from './nodeFilesystemToolContext';
import type { Workspace } from './workspace';

/**
 * Возвращает проверенный workspace для Node fs-инструментов.
 *
 * Функция гарантирует, что корень проекта задан, существует, является папкой и
 * приведён к realpath. После этого остальные инструменты могут безопасно
 * сравнивать реальные пути с корнем workspace.
 */
export async function getWorkspace({ context }: { context: NodeFilesystemToolContext }): Promise<Workspace> {
  if (typeof context.workspaceRoot !== 'string' || !context.workspaceRoot.trim()) {
    throw createToolError('INVALID_ARGUMENT', 'workspaceRoot must be a non-empty string.', {
      argument: 'workspaceRoot'
    });
  }

  const rootPath = path.resolve(context.workspaceRoot);
  const stat = await fs.promises.stat(rootPath);
  if (!stat.isDirectory()) {
    throw createToolError('NOT_A_DIRECTORY', `workspaceRoot must point to a directory: ${context.workspaceRoot}`, {
      workspaceRoot: context.workspaceRoot
    });
  }

  return {
    rootPath: await fs.promises.realpath(rootPath)
  };
}
