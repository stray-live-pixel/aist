import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { createToolError, toStructuredToolFailure } from '../../../shared/lib/toolErrors';
import type { OpenRouterTool } from '../../../shared/types/types';
import { requireString } from '../../shared/requireString';
import type { NodeFilesystemToolContext } from '../shared/nodeFilesystemToolContext';
import { resolveWorkspacePath } from '../shared/resolveWorkspacePath';

/**
 * Описание инструмента delete_path для модели.
 *
 * Инструмент предназначен для точечного безопасного удаления одного файла или
 * одной папки внутри workspace. Массовые сценарии должны идти через отдельный
 * bash-инструмент, где пользователь явно видит команду.
 */
export const deletePathToolDefinition: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'delete_path',
    description:
      'Delete a single workspace file or directory with safety checks. Directories require recursive=true; broad glob patterns are not allowed.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
        nextStep: {
          type: 'string',
          description: 'A short explanation of how this result will be used and what will be done next.'
        },
        path: { type: 'string', description: 'Workspace-relative path to a single file or directory.' },
        recursive: { type: 'boolean', description: 'Allow deleting a directory recursively.' }
      },
      required: ['reason', 'nextStep', 'path'],
      additionalProperties: false
    }
  }
};

/**
 * Безопасно удаляет один путь внутри workspace через bash rm -rf.
 *
 * Перед запуском команды функция запрещает wildcard-паттерны, корень workspace и
 * выходы наружу. Это сохраняет автоматизацию для точечных удалений, но не даёт
 * инструменту превращаться в массовый rm по проекту.
 */
export async function runDeletePathTool({
  context,
  args
}: {
  context: NodeFilesystemToolContext;
  args: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const targetPath = requireString({ value: args.path, name: 'path' });
  const recursive = Boolean(args.recursive);

  assertSafeDeleteInput({ targetPath });

  const resolved = await resolveWorkspacePath({ context, relativePath: targetPath, options: { allowMissing: false } });
  assertResolvedPathIsNotWorkspaceRoot({ targetPath, relativePath: resolved.relativePath });

  const stat = await fs.promises.lstat(resolved.absolutePath);
  if (stat.isDirectory() && !recursive) {
    throw createToolError('INVALID_ARGUMENT', `Directory deletion requires recursive=true: ${targetPath}`, {
      path: targetPath,
      recursive
    });
  }

  const result = await removePathWithBash({ absolutePath: resolved.absolutePath });
  if (!result.ok) {
    throw result.failure;
  }

  return {
    ok: true,
    path: targetPath,
    recursive,
    trash: false
  };
}

/**
 * Проверяет пользовательский путь до обращения к файловой системе.
 *
 * Здесь отсекаются массовые wildcard-паттерны, одиночные маски и фигурные glob-наборы.
 * Для таких действий продуктово правильнее использовать отдельный bash tool с
 * явной командой и отдельным разрешением пользователя.
 */
function assertSafeDeleteInput({ targetPath }: { targetPath: string }): void {
  const trimmedPath = targetPath.trim();
  if (!trimmedPath || trimmedPath === '.' || trimmedPath === './') {
    throw createToolError('INVALID_ARGUMENT', 'delete_path refuses to delete the workspace root.', {
      path: targetPath
    });
  }

  if (containsShellOrGlobPattern({ value: trimmedPath })) {
    throw createToolError(
      'INVALID_ARGUMENT',
      'delete_path accepts only one explicit path, not shell or glob patterns.',
      {
        path: targetPath
      }
    );
  }
}

/**
 * Запрещает удаление корня workspace после нормализации пути.
 *
 * Эта проверка дублирует ранний запрет `.` уже на нормализованном пути, чтобы
 * варианты вроде `./nested/..` тоже не могли удалить весь проект.
 */
function assertResolvedPathIsNotWorkspaceRoot({
  targetPath,
  relativePath
}: {
  targetPath: string;
  relativePath: string;
}): void {
  if (relativePath === '.') {
    throw createToolError('INVALID_ARGUMENT', 'delete_path refuses to delete the workspace root.', {
      path: targetPath
    });
  }
}

/**
 * Находит символы, которые превращают путь в массовый shell/glob-сценарий.
 *
 * Мы намеренно запрещаем широкий набор shell-метасимволов. Если разработчику
 * нужно сложное удаление по маске, он должен использовать bash-инструмент.
 */
function containsShellOrGlobPattern({ value }: { value: string }): boolean {
  return /[*?[\]{}]/.test(value);
}

/**
 * Выполняет фактическое удаление через bash rm -rf для одного проверенного пути.
 *
 * Абсолютный путь передаётся как аргумент `$1`, а не вставляется в строку
 * команды. Так пробелы, кавычки и спецсимволы в имени файла не становятся shell
 * injection и не меняют смысл команды.
 */
async function removePathWithBash({ absolutePath }: { absolutePath: string }): Promise<
  | { ok: true }
  | {
      ok: false;
      failure: ReturnType<typeof toStructuredToolFailure>;
    }
> {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-lc', 'rm -rf -- "$1"', 'delete_path', absolutePath], {
      cwd: path.dirname(absolutePath),
      env: process.env
    });

    child.on('error', (error) => {
      resolve({ ok: false, failure: toStructuredToolFailure(error) });
    });

    child.on('close', (exitCode, signal) => {
      if (exitCode === 0) {
        resolve({ ok: true });
        return;
      }

      resolve({
        ok: false,
        failure: {
          ok: false,
          code: 'INVALID_ARGUMENT',
          error:
            exitCode === null
              ? `delete_path rm exited without an exit code${signal ? ` after signal ${signal}` : ''}.`
              : `delete_path rm exited with code ${exitCode}.`
        }
      });
    });
  });
}
