import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';

import { createToolError, toStructuredToolFailure } from '../../../../shared/lib/toolErrors';
import type { OpenRouterTool } from '../../../../shared/types/types';
import type { NodeFilesystemToolContext } from '../../../fs/shared/nodeFilesystemToolContext';
import { clampNumber } from '../../../shared/clampNumber';
import { requireString } from '../../../shared/requireString';
import { appendOutput } from '../shared/appendOutput';
import { getProcessFailure } from '../shared/getProcessFailure';
import { resolveBashCwd } from './resolveBashCwd';

/**
 * Описание инструмента run_bash_script для модели.
 *
 * Контракт оставлен прежним: модель передаёт обязательные reason/nextStep/script
 * и может указать cwd, timeoutMs и maxOutputChars. Команда запускается как
 * `bash -lc` внутри workspace.
 */
export const runBashScriptToolDefinition: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'run_bash_script',
    description:
      'Run a Bash script from inside the workspace. Use for tests, builds, git-safe inspections, and shell-based diagnostics. Prefer write_file or replace_in_file for editing files; if using Bash for mass editing, explain why standard file-editing tools are not suitable.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'A short explanation of why this script needs to run.' },
        nextStep: {
          type: 'string',
          description: 'A short explanation of how this result will be used and what will be done next.'
        },
        script: { type: 'string', description: 'Bash script to execute with bash -lc.' },
        cwd: { type: 'string', description: 'Workspace-relative directory to run in. Default is ".".' },
        timeoutMs: { type: 'number', description: 'Timeout in milliseconds. Default is 30000, maximum is 120000.' },
        maxOutputChars: {
          type: 'number',
          description: 'Maximum stdout/stderr characters to return per stream. Default is 200000.'
        }
      },
      required: ['reason', 'nextStep', 'script'],
      additionalProperties: false
    }
  }
};

/**
 * Запускает Bash-скрипт внутри workspace и возвращает stdout/stderr.
 *
 * Функция сохраняет прежнее поведение: пустой script отклоняется, cwd проверяется
 * через fs-защиту workspace, stdout/stderr ограничиваются maxOutputChars, а при
 * таймауте процесс сначала получает SIGTERM и затем SIGKILL как страховку.
 */
export async function runBashScriptTool({
  context,
  args
}: {
  context: NodeFilesystemToolContext;
  args: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const script = requireString({ value: args.script, name: 'script' });
  if (!script.trim()) {
    throw createToolError('INVALID_ARGUMENT', 'Tool argument "script" must not be empty.', { argument: 'script' });
  }

  const cwd = typeof args.cwd === 'string' && args.cwd.trim() ? args.cwd : '.';
  const cwdPath = await resolveBashCwd({ context, cwd });
  const timeoutMs = clampNumber({ value: args.timeoutMs, fallback: 30000, min: 1000, max: 120000 });
  const maxOutputChars = clampNumber({ value: args.maxOutputChars, fallback: 200000, min: 1000, max: 1000000 });

  return runBashChildProcess({ script, cwd, absoluteCwd: cwdPath.absolutePath, timeoutMs, maxOutputChars });
}

/**
 * Управляет жизненным циклом дочернего Bash-процесса.
 *
 * Внутри собраны детали Node.js spawn: накопление вывода, таймер остановки,
 * обработка ошибок запуска и финальный result shape для модели.
 */
function runBashChildProcess({
  script,
  cwd,
  absoluteCwd,
  timeoutMs,
  maxOutputChars
}: {
  script: string;
  cwd: string;
  absoluteCwd: string;
  timeoutMs: number;
  maxOutputChars: number;
}): Promise<Record<string, unknown>> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn('bash', ['-lc', script], {
      cwd: absoluteCwd,
      env: process.env
    });
    let stdout = '';
    let stderr = '';
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    let closed = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!closed) {
          child.kill('SIGKILL');
        }
      }, 1500).unref();
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      const next = appendOutput({ current: stdout, chunk: chunk.toString('utf8'), maxChars: maxOutputChars });
      stdout = next.text;
      stdoutTruncated ||= next.truncated;
    });

    child.stderr.on('data', (chunk: Buffer) => {
      const next = appendOutput({ current: stderr, chunk: chunk.toString('utf8'), maxChars: maxOutputChars });
      stderr = next.text;
      stderrTruncated ||= next.truncated;
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        ...toStructuredToolFailure(error),
        ok: false,
        cwd,
        durationMs: Date.now() - startedAt
      });
    });

    child.on('close', (exitCode, signal) => {
      closed = true;
      clearTimeout(timeout);
      const ok = exitCode === 0 && !timedOut;
      resolve({
        ok,
        ...getProcessFailure({
          ok,
          timedOut,
          timeoutError: `Bash script timed out after ${timeoutMs}ms.`,
          exitCode,
          signal
        }),
        cwd,
        exitCode,
        signal,
        timedOut,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
        stdoutTruncated,
        stderrTruncated
      });
    });

    timeout.unref();
  });
}
