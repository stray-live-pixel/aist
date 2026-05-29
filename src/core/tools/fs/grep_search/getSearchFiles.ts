import fs from 'node:fs';
import path from 'node:path';

import { createToolError } from '../../../shared/lib/toolErrors';
import type { ResolvedWorkspacePath } from '../shared/resolvedWorkspacePath';
import type { Workspace } from '../shared/workspace';
import { matchesGlob } from './matchesGlob';
import { shouldSkipRelativePath } from './shouldSkipRelativePath';
import { toWorkspaceRelativePath } from './toWorkspaceRelativePath';

/**
 * Собирает список файлов, которые grep_search должен проверить.
 *
 * Если base указывает на файл — возвращаем только его. Если base указывает на
 * папку — рекурсивно обходим детей в стабильном алфавитном порядке, применяем
 * стандартные игноры, include-паттерн и ограничение maxFiles.
 */
export async function getSearchFiles({
  workspace,
  base,
  include,
  maxFiles
}: {
  workspace: Workspace;
  base: ResolvedWorkspacePath;
  include: string;
  maxFiles: number;
}): Promise<{ files: string[]; limitReached: boolean }> {
  const stat = await fs.promises.stat(base.absolutePath);

  if (stat.isFile()) {
    return { files: [base.absolutePath], limitReached: false };
  }

  if (!stat.isDirectory()) {
    throw createToolError('NOT_A_DIRECTORY', 'grep_search path must point to a file or directory.');
  }

  return walkSearchDirectory({ workspace, basePath: base.absolutePath, include, maxFiles });
}

/**
 * Обходит директорию и выбирает файлы для поиска.
 *
 * Детали обхода вынесены отдельно, чтобы верхняя функция читалась как бизнес-
 * правило: определить тип base и либо вернуть файл, либо пройти директорию.
 */
async function walkSearchDirectory({
  workspace,
  basePath,
  include,
  maxFiles
}: {
  workspace: Workspace;
  basePath: string;
  include: string;
  maxFiles: number;
}): Promise<{ files: string[]; limitReached: boolean }> {
  const files: string[] = [];
  let limitReached = false;

  const walk = async ({ directoryPath }: { directoryPath: string }): Promise<void> => {
    if (files.length >= maxFiles) {
      limitReached = true;
      return;
    }

    const children = await fs.promises.readdir(directoryPath, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name));

    for (const child of children) {
      if (files.length >= maxFiles) {
        limitReached = true;
        return;
      }

      if (shouldSkipRelativePath({ relativePath: child.name })) {
        continue;
      }

      const childPath = path.join(directoryPath, child.name);
      if (child.isDirectory()) {
        await walk({ directoryPath: childPath });
        continue;
      }

      if (!child.isFile()) {
        continue;
      }

      const relativeToBase = path.relative(basePath, childPath).replace(/\\/g, '/');
      const workspaceRelative = toWorkspaceRelativePath({ rootPath: workspace.rootPath, absolutePath: childPath });
      if (
        shouldSkipRelativePath({ relativePath: workspaceRelative }) ||
        !matchesGlob({ relativePath: relativeToBase, pattern: include })
      ) {
        continue;
      }

      files.push(childPath);
    }
  };

  await walk({ directoryPath: basePath });
  return { files, limitReached };
}
