import fs from 'node:fs';

import type { OpenRouterTool } from '../../../shared/types/types';
import { requireString } from '../../shared/requireString';
import type { NodeFilesystemToolContext } from '../shared/nodeFilesystemToolContext';
import { resolveWorkspacePath } from '../shared/resolveWorkspacePath';

/**
 * Описание инструмента create_directory для модели.
 *
 * Контракт сохранён прежним: агент передаёт workspace-relative путь папки, а
 * инструмент создаёт её вместе с отсутствующими родителями внутри workspace.
 */
export const createDirectoryToolDefinition: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'create_directory',
    description: 'Create a workspace directory, including parent directories.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
        nextStep: {
          type: 'string',
          description: 'A short explanation of how this result will be used and what will be done next.'
        },
        path: { type: 'string', description: 'Workspace-relative directory path.' }
      },
      required: ['reason', 'nextStep', 'path'],
      additionalProperties: false
    }
  }
};

/**
 * Создаёт директорию внутри workspace.
 *
 * Функция сначала проходит общий fs-шлюз безопасности, чтобы не создать папку за
 * пределами проекта или через symlink-выход, а затем использует recursive mkdir,
 * сохраняя прежнее поведение создания всей цепочки родителей.
 */
export async function runCreateDirectoryTool({
  context,
  args
}: {
  context: NodeFilesystemToolContext;
  args: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const dirPath = requireString({ value: args.path, name: 'path' });
  const resolved = await resolveWorkspacePath({ context, relativePath: dirPath, options: { allowMissing: true } });

  await fs.promises.mkdir(resolved.absolutePath, { recursive: true });

  return {
    ok: true,
    path: dirPath
  };
}
