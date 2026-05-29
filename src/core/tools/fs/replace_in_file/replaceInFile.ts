import fs from 'node:fs';

import { createToolError } from '../../../shared/lib/toolErrors';
import type { OpenRouterTool } from '../../../shared/types/types';
import { getChangedLineRange } from '../../shared/getChangedLineRange';
import { requireString } from '../../shared/requireString';
import type { NodeFilesystemToolContext } from '../shared/nodeFilesystemToolContext';
import { resolveWorkspacePath } from '../shared/resolveWorkspacePath';

/**
 * Описание инструмента replace_in_file для модели.
 *
 * Контракт оставлен прежним: модель передаёт путь, точный фрагмент для поиска,
 * заменяющий текст и опциональный флаг all. Инструмент работает только с UTF-8
 * файлами внутри workspace и не создаёт новый файл, если путь отсутствует.
 */
export const replaceInFileToolDefinition: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'replace_in_file',
    description: 'Replace text in an existing UTF-8 file.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
        nextStep: {
          type: 'string',
          description: 'A short explanation of how this result will be used and what will be done next.'
        },
        path: { type: 'string', description: 'Workspace-relative file path.' },
        search: { type: 'string', description: 'Exact text to find.' },
        replace: { type: 'string', description: 'Replacement text.' },
        all: { type: 'boolean', description: 'Replace all matches instead of only the first.' }
      },
      required: ['reason', 'nextStep', 'path', 'search', 'replace'],
      additionalProperties: false
    }
  }
};

/**
 * Заменяет точный текст в существующем UTF-8 файле внутри workspace.
 *
 * Функция повторяет прежнее поведение: без all меняется только первое вхождение,
 * с all меняются все вхождения, а если текст не найден — возвращается
 * структурированная ошибка TEXT_NOT_FOUND через общий runner.
 */
export async function runReplaceInFileTool({
  context,
  args
}: {
  context: NodeFilesystemToolContext;
  args: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const filePath = requireString({ value: args.path, name: 'path' });
  const search = requireString({ value: args.search, name: 'search' });
  const replace = requireString({ value: args.replace, name: 'replace' });
  const replaceAll = Boolean(args.all);

  // allowMissing=false сохраняет продуктовый смысл: заменить можно только существующий файл.
  const resolved = await resolveWorkspacePath({ context, relativePath: filePath, options: { allowMissing: false } });
  const content = await fs.promises.readFile(resolved.absolutePath, 'utf8');

  if (!content.includes(search)) {
    throw createToolError('TEXT_NOT_FOUND', `Text was not found in ${filePath}.`, { path: filePath });
  }

  const nextContent = replaceAll ? content.split(search).join(replace) : content.replace(search, replace);
  const count = replaceAll ? content.split(search).length - 1 : 1;
  const changedRange = getChangedLineRange({ beforeContent: content, afterContent: nextContent });

  await fs.promises.writeFile(resolved.absolutePath, nextContent, 'utf8');

  return {
    ok: true,
    path: filePath,
    replacements: count,
    ...changedRange
  };
}
