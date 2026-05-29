import fs from 'node:fs';
import path from 'node:path';

import { createToolError } from '../../../shared/lib/toolErrors';
import type { OpenRouterTool } from '../../../shared/types/types';
import { clampNumber } from '../../shared/clampNumber';
import type { NodeFilesystemToolContext } from '../shared/nodeFilesystemToolContext';
import { resolveWorkspacePath } from '../shared/resolveWorkspacePath';
import { shouldSkipPath } from '../shared/shouldSkipPath';

type ListFileEntry = {
  path: string;
  type: string;
};

/**
 * Описание инструмента list_files для модели.
 *
 * Контракт сохранён прежним: агент передаёт workspace-relative директорию,
 * глубину обхода и лимит, а получает отсортированный список файлов и папок.
 */
export const listFilesToolDefinition: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'list_files',
    description: 'List files and directories under a workspace-relative path.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
        nextStep: {
          type: 'string',
          description: 'A short explanation of how this result will be used and what will be done next.'
        },
        path: { type: 'string', description: 'Workspace-relative directory path. Use "." for root.' },
        maxDepth: { type: 'number', description: 'Maximum recursive depth. Default is 2.' },
        limit: { type: 'number', description: 'Maximum number of entries. Default is 200.' }
      },
      required: ['reason', 'nextStep'],
      additionalProperties: false
    }
  }
};

/**
 * Возвращает дерево файлов workspace для агента.
 *
 * Функция только читает структуру директорий: сначала безопасно разрешает путь,
 * затем проверяет, что это папка, и рекурсивно собирает элементы с теми же
 * лимитами, сортировкой и стандартными игнорами, что были раньше.
 */
export async function runListFilesTool({
  context,
  args
}: {
  context: NodeFilesystemToolContext;
  args: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const rawPath = String(args.path || '.');
  const resolved = await resolveWorkspacePath({ context, relativePath: rawPath, options: { allowMissing: false } });
  const stat = await fs.promises.stat(resolved.absolutePath);
  if (!stat.isDirectory()) {
    throw createToolError('NOT_A_DIRECTORY', `list_files path must point to a workspace directory: ${rawPath}`, {
      path: rawPath
    });
  }

  const maxDepth = clampNumber({ value: args.maxDepth, fallback: 2, min: 0, max: 8 });
  const limit = clampNumber({ value: args.limit, fallback: 200, min: 1, max: 1000 });
  const entries: ListFileEntry[] = [];

  await walkDirectory({
    directoryPath: resolved.absolutePath,
    relativeBase: '.',
    depth: 0,
    maxDepth,
    limit,
    entries
  });

  return {
    ok: true,
    path: args.path || '.',
    entries,
    truncated: entries.length >= limit
  };
}

/**
 * Рекурсивно обходит директорию и наполняет ответ list_files.
 *
 * Обход детерминированный: элементы сортируются по имени, поэтому одинаковый
 * workspace даёт одинаковый результат в тестах, CLI и VS Code.
 */
async function walkDirectory({
  directoryPath,
  relativeBase,
  depth,
  maxDepth,
  limit,
  entries
}: {
  directoryPath: string;
  relativeBase: string;
  depth: number;
  maxDepth: number;
  limit: number;
  entries: ListFileEntry[];
}): Promise<void> {
  if (entries.length >= limit) {
    return;
  }

  const children = await fs.promises.readdir(directoryPath, { withFileTypes: true });
  children.sort((left, right) => left.name.localeCompare(right.name));

  for (const child of children) {
    if (entries.length >= limit) {
      return;
    }

    // Служебные и тяжёлые директории не нужны агенту для понимания проекта.
    if (shouldSkipPath({ name: child.name })) {
      continue;
    }

    const childRelative = relativeBase === '.' ? child.name : `${relativeBase}/${child.name}`;
    const isDirectory = child.isDirectory();
    entries.push({
      path: childRelative,
      type: isDirectory ? 'directory' : 'file'
    });

    if (isDirectory && depth < maxDepth) {
      await walkDirectory({
        directoryPath: path.join(directoryPath, child.name),
        relativeBase: childRelative,
        depth: depth + 1,
        maxDepth,
        limit,
        entries
      });
    }
  }
}
