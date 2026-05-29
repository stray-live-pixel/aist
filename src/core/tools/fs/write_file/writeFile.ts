import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';

import type { OpenRouterTool } from '../../../shared/types/types';
import { getChangedLineRange } from '../../shared/getChangedLineRange';
import { requireString } from '../../shared/requireString';
import type { NodeFilesystemToolContext } from '../shared/nodeFilesystemToolContext';
import { resolveWorkspacePath } from '../shared/resolveWorkspacePath';
import { readTextFileIfExists } from './readTextFileIfExists';

/**
 * Описание инструмента write_file для модели.
 *
 * Контракт оставлен прежним: модель обязана объяснить причину и следующий шаг,
 * передать workspace-relative путь и полный UTF-8 текст файла. Инструмент создаёт
 * новый файл или полностью перезаписывает существующий файл.
 */
export const writeFileToolDefinition: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'write_file',
    description: 'Create or overwrite a UTF-8 text file in the workspace.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
        nextStep: {
          type: 'string',
          description: 'A short explanation of how this result will be used and what will be done next.'
        },
        path: { type: 'string', description: 'Workspace-relative file path.' },
        content: { type: 'string', description: 'Full file content to write.' }
      },
      required: ['reason', 'nextStep', 'path', 'content'],
      additionalProperties: false
    }
  }
};

/**
 * Создаёт или полностью перезаписывает UTF-8 файл внутри workspace.
 *
 * Функция сначала безопасно разрешает путь, затем читает прошлое содержимое для
 * расчёта диапазона изменений, создаёт недостающие родительские папки и только
 * после этого записывает новый текст. Так пользователь получает прежний результат
 * инструмента: путь, количество байт и координаты изменённого диапазона.
 */
export async function runWriteFileTool({
  context,
  args
}: {
  context: NodeFilesystemToolContext;
  args: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const filePath = requireString({ value: args.path, name: 'path' });
  const content = requireString({ value: args.content, name: 'content' });

  // allowMissing=true сохраняет поведение создания нового файла и вложенных папок.
  const resolved = await resolveWorkspacePath({ context, relativePath: filePath, options: { allowMissing: true } });
  const previousContent = await readTextFileIfExists({ filePath: resolved.absolutePath });
  const changedRange = getChangedLineRange({ beforeContent: previousContent || '', afterContent: content });

  // Родительские папки создаются автоматически, как и в прежней inline-реализации.
  await fs.promises.mkdir(path.dirname(resolved.absolutePath), { recursive: true });
  await fs.promises.writeFile(resolved.absolutePath, content, 'utf8');

  return {
    ok: true,
    path: filePath,
    bytes: Buffer.byteLength(content, 'utf8'),
    ...changedRange
  };
}
