import fs from 'node:fs';

import type { OpenRouterTool } from '../../../shared/types/types';
import { clampNumber } from '../../shared/clampNumber';
import { requireString } from '../../shared/requireString';
import type { NodeFilesystemToolContext } from '../shared/nodeFilesystemToolContext';
import { resolveWorkspacePath } from '../shared/resolveWorkspacePath';

/**
 * Описание инструмента read_file для модели.
 *
 * Контракт оставлен прежним: модель передаёт путь внутри workspace и опциональный
 * лимит символов, а инструмент возвращает UTF-8 содержимое файла и признак
 * усечения ответа.
 */
export const readFileToolDefinition: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'read_file',
    description: 'Read a UTF-8 text file from the workspace.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
        nextStep: {
          type: 'string',
          description: 'A short explanation of how this result will be used and what will be done next.'
        },
        path: { type: 'string', description: 'Workspace-relative file path.' },
        maxChars: { type: 'number', description: 'Maximum characters to return. Default is 200000.' }
      },
      required: ['reason', 'nextStep', 'path'],
      additionalProperties: false
    }
  }
};

/**
 * Читает UTF-8 файл из workspace для агента.
 *
 * Функция не меняет файловую систему: она только проверяет аргументы, безопасно
 * разрешает путь внутри проекта, читает файл и при необходимости обрезает ответ,
 * чтобы не перегружать контекст модели слишком большим содержимым.
 */
export async function runReadFileTool({
  context,
  args
}: {
  context: NodeFilesystemToolContext;
  args: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const filePath = requireString({ value: args.path, name: 'path' });
  const maxChars = clampNumber({ value: args.maxChars, fallback: 200000, min: 1000, max: 2000000 });

  // Все операции с файлами проходят через общий fs-шлюз, чтобы не выйти за workspace.
  const resolved = await resolveWorkspacePath({ context, relativePath: filePath, options: { allowMissing: false } });
  const content = await fs.promises.readFile(resolved.absolutePath, 'utf8');
  const truncated = content.length > maxChars;

  return {
    ok: true,
    path: filePath,
    content: truncated ? content.slice(0, maxChars) : content,
    truncated
  };
}
