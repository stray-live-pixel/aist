import { spawn } from 'node:child_process';
import fs from 'node:fs';

import { createToolError, toStructuredToolFailure } from '../../shared/lib/toolErrors';
import type { OpenRouterTool, ToolPermissionMode } from '../../shared/types/types';
import { resolveNodeWorkspacePath } from '../filesystem-tools/filesystemTools';

export type AgentSkill = {
  id: string;
  label: string;
  description: string;
  command: string;
  permission: ToolPermissionMode;
  scope?: string;
};

export const runSkillTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'run_skill',
    description: 'Run a user-defined custom skill by ID. Use this only for skills listed in the system prompt.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'A short explanation of why this skill is needed.' },
        skillId: { type: 'string', description: 'ID of the custom skill to run.' },
        input: {
          type: 'string',
          description: 'Optional text or JSON payload for the skill. It is passed via stdin and AIST_SKILL_INPUT.'
        },
        cwd: { type: 'string', description: 'Workspace-relative directory to run in. Default is ".".' },
        timeoutMs: { type: 'number', description: 'Timeout in milliseconds. Default is 30000, maximum is 120000.' },
        maxOutputChars: {
          type: 'number',
          description: 'Maximum stdout/stderr characters to return per stream. Default is 200000.'
        }
      },
      required: ['reason', 'skillId'],
      additionalProperties: false
    }
  }
};

export async function runNodeSkillTool(input: {
  skills: readonly AgentSkill[];
  workspaceRoot: string;
  args: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  try {
    return await runNodeSkillToolImpl(input);
  } catch (error) {
    return toStructuredToolFailure(error);
  }
}

async function runNodeSkillToolImpl(input: {
  skills: readonly AgentSkill[];
  workspaceRoot: string;
  args: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const skillId = requireString(input.args.skillId, 'skillId');
  const skill = input.skills.find((item) => item.id === skillId);
  if (!skill) {
    throw createToolError('INVALID_ARGUMENT', `Unknown skill: ${skillId}`, { skillId });
  }

  if (!skill.command.trim()) {
    throw createToolError('INVALID_ARGUMENT', `Skill "${skill.label}" has no command.`, { skillId });
  }

  const stdin = typeof input.args.input === 'string' ? input.args.input : '';
  const cwd = typeof input.args.cwd === 'string' && input.args.cwd.trim() ? input.args.cwd : '.';
  const cwdPath = await resolveNodeWorkspacePath({ workspaceRoot: input.workspaceRoot }, cwd, { allowMissing: false });
  const stat = await fs.promises.stat(cwdPath.absolutePath);
  if (!stat.isDirectory()) {
    throw createToolError('NOT_A_DIRECTORY', `cwd must point to a workspace directory: ${cwd}`, { cwd });
  }

  const timeoutMs = clampNumber(input.args.timeoutMs, 30000, 1000, 120000);
  const maxOutputChars = clampNumber(input.args.maxOutputChars, 200000, 1000, 1000000);
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn('bash', ['-lc', skill.command], {
      cwd: cwdPath.absolutePath,
      env: {
        ...process.env,
        AIST_SKILL_ID: skill.id,
        AIST_SKILL_LABEL: skill.label,
        AIST_SKILL_INPUT: stdin
      }
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
        skillId: skill.id,
        label: skill.label,
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
        ...getProcessFailure(ok, timedOut, `Skill "${skill.label}" timed out after ${timeoutMs}ms.`, exitCode, signal),
        skillId: skill.id,
        label: skill.label,
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

    child.stdin.end(stdin);
    timeout.unref();
  });
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw createToolError('INVALID_ARGUMENT', `Tool argument "${name}" must be a non-empty string.`, {
      argument: name
    });
  }
  return value;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(numeric)));
}

function getProcessFailure(
  ok: boolean,
  timedOut: boolean,
  timeoutMessage: string,
  exitCode: number | null,
  signal: NodeJS.Signals | null
): Record<string, unknown> {
  if (ok) {
    return {};
  }

  return {
    code: timedOut ? 'TIMEOUT' : 'INVALID_ARGUMENT',
    error: timedOut ? timeoutMessage : `Skill process exited with code ${exitCode ?? signal ?? 'unknown'}.`
  };
}

function appendOutput(current: string, addition: string, maxChars: number): { text: string; truncated: boolean } {
  const next = current + addition;
  if (next.length <= maxChars) {
    return { text: next, truncated: false };
  }
  return { text: next.slice(0, maxChars), truncated: true };
}
