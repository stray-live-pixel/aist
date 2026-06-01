import { spawn } from 'node:child_process';

import { createToolError, toStructuredToolFailure } from '../../../shared/lib/toolErrors';
import { ProjectToolDefinition } from './ProjectToolDefinition';
import { appendOutput } from './appendOutput';
import { assertScriptFile } from './assertScriptFile';

export async function executeProjectToolImpl(
  definition: ProjectToolDefinition,
  args: Record<string, unknown>,
  workspaceRoot: string
): Promise<Record<string, unknown>> {
  if (typeof args.reason !== 'string' || !args.reason.trim()) {
    throw createToolError('INVALID_ARGUMENT', 'Project tool calls must include a non-empty reason.', {
      toolId: definition.id,
      argument: 'reason'
    });
  }
  if (typeof args.nextStep !== 'string' || !args.nextStep.trim()) {
    throw createToolError('INVALID_ARGUMENT', 'Project tool calls must include a non-empty nextStep.', {
      toolId: definition.id,
      argument: 'nextStep'
    });
  }

  await assertScriptFile(definition);
  const startedAt = Date.now();
  const maxOutputChars = 1000000;

  return new Promise((resolve) => {
    const child = spawn('bash', [definition.scriptPath], {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        AIST_PROJECT_TOOL_ID: definition.id,
        AIST_PROJECT_TOOL_LABEL: definition.label,
        AIST_PROJECT_TOOL_VERSION: definition.version
      }
    });
    let stdout = '';
    let stderr = '';
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let closed = false;
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!closed) {
          child.kill('SIGKILL');
        }
      }, 1500).unref();
    }, 30000);

    child.stdout.on('data', (chunk: Buffer) => {
      const next = appendOutput(stdout, chunk.toString('utf8'), maxOutputChars);
      stdout = next.text;
      stdoutTruncated ||= next.truncated;
    });
    child.stderr.on('data', (chunk: Buffer) => {
      const next = appendOutput(stderr, chunk.toString('utf8'), maxOutputChars);
      stderr = next.text;
      stderrTruncated ||= next.truncated;
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        ...toStructuredToolFailure(error),
        ok: false,
        toolId: definition.id,
        durationMs: Date.now() - startedAt
      });
    });
    child.on('close', (exitCode, signal) => {
      closed = true;
      clearTimeout(timeout);
      const ok = exitCode === 0 && !timedOut;
      const base = {
        ok,
        toolId: definition.id,
        label: definition.label,
        version: definition.version,
        exitCode,
        signal,
        timedOut,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
        stdoutTruncated,
        stderrTruncated
      };
      if (!ok) {
        resolve({
          ...base,
          code: timedOut ? 'TIMEOUT' : 'INVALID_ARGUMENT',
          error: timedOut
            ? `Project tool "${definition.label}" timed out after 30000ms.`
            : `Project tool "${definition.label}" exited with code ${exitCode}.`
        });
        return;
      }

      if (definition.outputMode === 'json') {
        try {
          resolve({ ...base, output: stdout.trim() ? JSON.parse(stdout) : null });
        } catch (error) {
          resolve({
            ...base,
            ok: false,
            code: 'INVALID_JSON_OUTPUT',
            error: error instanceof Error ? error.message : String(error)
          });
        }
        return;
      }

      resolve(base);
    });
    child.stdin.end(`${JSON.stringify(args)}\n`);
    timeout.unref();
  });
}
