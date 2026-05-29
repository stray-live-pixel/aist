import fs from 'node:fs';

import { createToolError } from '../../../shared/lib/toolErrors';
import type { OpenRouterTool } from '../../../shared/types/types';
import { requireString } from '../../shared/requireString';
import type { NodeFilesystemToolContext } from '../shared/nodeFilesystemToolContext';
import { resolveWorkspacePath } from '../shared/resolveWorkspacePath';

const MAX_READ_FILE_RANGE_LINES = 400;

/**
 * Описание инструмента read_file_range для модели.
 *
 * Инструмент нужен для точечного чтения части больших файлов: агент передаёт
 * путь и диапазон строк, а получает только ограниченный фрагмент без загрузки
 * всего файла в контекст.
 */
export const readFileRangeToolDefinition: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'read_file_range',
    description:
      'Read a bounded line range from a UTF-8 workspace file only when exact lines are known, the file is too large to read fully, or a small fragment is certainly sufficient; do not use it for first-pass exploration of unfamiliar files.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description:
            'A short explanation of why this exact line range is enough now, or why reading the full file would be wasteful.'
        },
        nextStep: {
          type: 'string',
          description: 'A short explanation of how this result will be used and what will be done next.'
        },
        path: { type: 'string', description: 'Workspace-relative file path.' },
        startLine: { type: 'number', description: '1-based start line. Values below 1 are clamped to the file start.' },
        endLine: { type: 'number', description: '1-based end line. The returned range is capped to 400 lines.' }
      },
      required: ['reason', 'nextStep', 'path', 'startLine', 'endLine'],
      additionalProperties: false
    }
  }
};

/**
 * Читает ограниченный диапазон строк из файла workspace.
 *
 * Поведение сохранено от старой реализации: start/end приводятся к числам,
 * startLine ниже 1 прижимается к первой строке, диапазон ограничивается 400
 * строками, а в ответе возвращается признак truncatedRange.
 */
export async function runReadFileRangeTool({
  context,
  args
}: {
  context: NodeFilesystemToolContext;
  args: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const filePath = requireString({ value: args.path, name: 'path' });
  const requestedStartLine = requireLineNumber({ value: args.startLine, name: 'startLine' });
  const requestedEndLine = requireLineNumber({ value: args.endLine, name: 'endLine' });

  if (requestedStartLine > requestedEndLine) {
    throw createToolError('INVALID_ARGUMENT', 'Tool argument "startLine" must be less than or equal to "endLine".');
  }

  const resolved = await resolveWorkspacePath({ context, relativePath: filePath, options: { allowMissing: false } });
  const content = await fs.promises.readFile(resolved.absolutePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const totalLines = lines.length;
  const startLine = Math.min(Math.max(requestedStartLine, 1), totalLines);
  const rangeLimitedEndLine = Math.min(requestedEndLine, startLine + MAX_READ_FILE_RANGE_LINES - 1);
  const endLine = Math.min(Math.max(rangeLimitedEndLine, startLine), totalLines);

  return {
    ok: true,
    path: filePath,
    startLine,
    endLine,
    totalLines,
    content: lines.slice(startLine - 1, endLine).join('\n'),
    truncatedRange: startLine !== requestedStartLine || endLine !== requestedEndLine
  };
}

/**
 * Проверяет и нормализует номер строки для read_file_range.
 *
 * Невалидные значения сразу дают структурированную ошибку, чтобы агент понимал,
 * какой именно аргумент надо исправить в следующем вызове.
 */
function requireLineNumber({ value, name }: { value: unknown; name: string }): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw createToolError('INVALID_ARGUMENT', `Tool argument "${name}" must be a finite number.`, {
      argument: name
    });
  }

  return Math.floor(numeric);
}
