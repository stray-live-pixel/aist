import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { toStructuredToolFailure } from '../../../../shared/lib/toolErrors';
import { runBashScriptTool, runBashScriptToolDefinition } from './runBashScript';

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-run-bash-script-tool-'));
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe('run_bash_script tool definition', () => {
  it('keeps the public contract visible to the model', () => {
    expect(runBashScriptToolDefinition).toMatchObject({
      type: 'function',
      function: {
        name: 'run_bash_script',
        description:
          'Run a Bash script from inside the workspace. Use for tests, builds, git-safe inspections, and shell-based diagnostics. Prefer write_file or replace_in_file for editing files; if using Bash for mass editing, explain why standard file-editing tools are not suitable.',
        parameters: {
          required: ['reason', 'nextStep', 'script'],
          additionalProperties: false,
          properties: {
            reason: { type: 'string' },
            nextStep: { type: 'string' },
            script: { type: 'string' },
            cwd: { type: 'string' },
            timeoutMs: { type: 'number' },
            maxOutputChars: { type: 'number' }
          }
        }
      }
    });
  });
});

describe('runBashScriptTool', () => {
  it('runs a bash script from the workspace root and returns stdout', async () => {
    const result = await runBashScriptTool({
      context: { workspaceRoot },
      args: {
        reason: 'verify cwd',
        nextStep: 'use output',
        script: 'pwd && printf done',
        timeoutMs: 5000
      }
    });

    expect(result).toMatchObject({
      ok: true,
      cwd: '.',
      exitCode: 0,
      signal: null,
      timedOut: false,
      stderr: '',
      stdoutTruncated: false,
      stderrTruncated: false
    });
    expect(String(result.stdout)).toContain(workspaceRoot);
    expect(String(result.stdout)).toContain('done');
  });

  it('runs from a workspace-relative cwd', async () => {
    fs.mkdirSync(path.join(workspaceRoot, 'src'), { recursive: true });

    const result = await runBashScriptTool({
      context: { workspaceRoot },
      args: {
        reason: 'verify nested cwd',
        nextStep: 'use output',
        script: 'pwd',
        cwd: 'src',
        timeoutMs: 5000
      }
    });

    expect(result).toMatchObject({ ok: true, cwd: 'src', exitCode: 0, timedOut: false });
    expect(String(result.stdout).trim()).toBe(fs.realpathSync(path.join(workspaceRoot, 'src')));
  });

  it('times out long-running scripts with the same result shape', async () => {
    await expect(
      runBashScriptTool({
        context: { workspaceRoot },
        args: {
          reason: 'verify timeout',
          nextStep: 'stop process',
          script: 'sleep 2',
          timeoutMs: 1000
        }
      })
    ).resolves.toMatchObject({
      ok: false,
      code: 'TIMEOUT',
      cwd: '.',
      timedOut: true
    });
  });

  it('truncates noisy stdout and stderr using the clamped output limit', async () => {
    const result = await runBashScriptTool({
      context: { workspaceRoot },
      args: {
        reason: 'verify truncation',
        nextStep: 'use truncated output',
        script: 'python3 - <<\'PY\'\nimport sys\nprint("o" * 1200)\nprint("e" * 1200, file=sys.stderr)\nPY',
        maxOutputChars: 10,
        timeoutMs: 5000
      }
    });

    // Минимальный лимит остаётся 1000 символов: маленькое значение модели не ломает полезный ответ.
    expect(result).toMatchObject({ ok: true, stdoutTruncated: true, stderrTruncated: true });
    expect(String(result.stdout)).toHaveLength(1000);
    expect(String(result.stderr)).toHaveLength(1000);
  });

  it('rejects an empty script before starting a process', async () => {
    let failure: ReturnType<typeof toStructuredToolFailure> | undefined;

    try {
      await runBashScriptTool({
        context: { workspaceRoot },
        args: { reason: 'empty script', nextStep: 'stop', script: '   ' }
      });
    } catch (error) {
      failure = toStructuredToolFailure(error);
    }

    expect(failure).toMatchObject({
      ok: false,
      code: 'INVALID_ARGUMENT',
      details: { argument: 'script' }
    });
  });

  it('rejects cwd when it is a file', async () => {
    fs.writeFileSync(path.join(workspaceRoot, 'file.txt'), 'content');
    let failure: ReturnType<typeof toStructuredToolFailure> | undefined;

    try {
      await runBashScriptTool({
        context: { workspaceRoot },
        args: {
          reason: 'bad cwd',
          nextStep: 'stop',
          script: 'pwd',
          cwd: 'file.txt'
        }
      });
    } catch (error) {
      failure = toStructuredToolFailure(error);
    }

    expect(failure).toMatchObject({
      ok: false,
      code: 'NOT_A_DIRECTORY',
      details: { cwd: 'file.txt' }
    });
  });
});
