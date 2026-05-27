import { spawn } from 'node:child_process';
import * as vscode from 'vscode';

import {
  type AgentItemScope,
  readAgentConfig,
  readGlobalAgentConfig,
  updateAgentConfig,
  updateGlobalAgentConfig
} from '../agent/config/agentConfigStore';
import type { OpenRouterTool } from '../openrouter/types';
import { createToolError, toStructuredToolFailure } from '../shared/toolErrors';
import { resolveWorkspacePath } from '../shared/workspace';
import type { ToolPermissionMode } from '../tools/permissions';

export type AgentSkill = {
  id: string;
  label: string;
  description: string;
  command: string;
  permission: ToolPermissionMode;
  scope: AgentItemScope;
};

type StoredAgentSkill = Omit<AgentSkill, 'scope'> & { scope?: AgentItemScope };

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
          description: 'Maximum stdout/stderr characters to return per stream. Default is 20000.'
        }
      },
      required: ['reason', 'skillId'],
      additionalProperties: false
    }
  }
};

/**
 * Возвращает эффективный список навыков: сначала глобальные, затем проектные.
 *
 * Проектный навык с тем же id переопределяет глобальный, потому что run_skill принимает только skillId без scope.
 * Такой порядок соответствует остальным настройкам: локальный workspace имеет приоритет над пользовательским global.
 */
export function getAgentSkills(): AgentSkill[] {
  const globalSkills = getAgentSkillsByScope('global');
  const localSkills = getAgentSkillsByScope('local');
  const byId = new Map<string, AgentSkill>();

  for (const skill of [...globalSkills, ...localSkills]) {
    byId.set(skill.id, skill);
  }

  return [...byId.values()];
}

/**
 * Возвращает навыки конкретной области хранения без смешивания scope.
 *
 * UI использует это косвенно через поле scope в AgentSkill, а CRUD-команды — чтобы не удалить одноимённый навык из другой области.
 */
export function getAgentSkillsByScope(scope: AgentItemScope): AgentSkill[] {
  const raw = readSkills(scope);
  if (!Array.isArray(raw)) {
    return [];
  }

  const skills: AgentSkill[] = [];
  const usedIds = new Set<string>();

  for (const item of raw) {
    const skill = normalizeSkill(item, scope);
    if (!skill || usedIds.has(skill.id)) {
      continue;
    }

    usedIds.add(skill.id);
    skills.push(skill);
  }

  return skills;
}

export function getAgentSkill(skillId: string): AgentSkill | undefined {
  return getAgentSkills().find((skill) => skill.id === skillId);
}

export function getSkillPermission(skillId: string): ToolPermissionMode {
  return getAgentSkill(skillId)?.permission || 'ask';
}

export async function addAgentSkill(input: {
  scope?: AgentItemScope;
  label: string;
  description: string;
  command: string;
  permission?: ToolPermissionMode;
}): Promise<AgentSkill> {
  const scope = input.scope || 'local';
  const skills = getAgentSkillsByScope(scope);
  const baseId = createSkillId(input.label);
  let id = baseId;
  let counter = 1;

  while (skills.some((skill) => skill.id === id)) {
    id = `${baseId}-${counter}`;
    counter++;
  }

  const skill: AgentSkill = {
    id,
    label: input.label.trim(),
    description: input.description.trim(),
    command: input.command.trim(),
    permission: normalizePermission(input.permission, 'ask'),
    scope
  };

  await updateSkills(scope, [...skills, skill]);
  return skill;
}

export async function updateAgentSkill(
  skillId: string,
  patch: Partial<Omit<AgentSkill, 'id' | 'scope'>>,
  scope: AgentItemScope = 'local'
): Promise<boolean> {
  const skills = getAgentSkillsByScope(scope);
  let updated = false;

  const next = skills.map((skill) => {
    if (skill.id !== skillId) {
      return skill;
    }

    updated = true;
    return {
      ...skill,
      label: typeof patch.label === 'string' ? patch.label.trim() || skill.label : skill.label,
      description: typeof patch.description === 'string' ? patch.description.trim() : skill.description,
      command: typeof patch.command === 'string' ? patch.command.trim() : skill.command,
      permission: normalizePermission(patch.permission, skill.permission)
    };
  });

  if (!updated) {
    return false;
  }

  await updateSkills(scope, next);
  return true;
}

export async function deleteAgentSkill(skillId: string, scope: AgentItemScope = 'local'): Promise<boolean> {
  const skills = getAgentSkillsByScope(scope);
  const next = skills.filter((skill) => skill.id !== skillId);

  if (next.length === skills.length) {
    return false;
  }

  await updateSkills(scope, next);
  return true;
}

export async function runAgentSkill(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    return await runAgentSkillImpl(args);
  } catch (error) {
    return toStructuredToolFailure(error);
  }
}

async function runAgentSkillImpl(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const skillId = requireString(args.skillId, 'skillId');
  const skill = getAgentSkill(skillId);
  if (!skill) {
    throw createToolError('INVALID_ARGUMENT', `Unknown skill: ${skillId}`, { skillId });
  }

  if (!skill.command.trim()) {
    throw createToolError('INVALID_ARGUMENT', `Skill "${skill.label}" has no command.`, { skillId });
  }

  const input = typeof args.input === 'string' ? args.input : '';
  const cwd = typeof args.cwd === 'string' && args.cwd.trim() ? args.cwd : '.';
  const cwdUri = resolveWorkspacePath(cwd);
  const stat = await vscode.workspace.fs.stat(cwdUri);
  if (stat.type !== vscode.FileType.Directory) {
    throw createToolError('NOT_A_DIRECTORY', `cwd must point to a workspace directory: ${cwd}`, { cwd });
  }

  const timeoutMs = clampNumber(args.timeoutMs, 30000, 1000, 120000);
  const maxOutputChars = clampNumber(args.maxOutputChars, 20000, 1000, 100000);
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn('bash', ['-lc', skill.command], {
      cwd: cwdUri.fsPath,
      env: {
        ...process.env,
        AIST_SKILL_ID: skill.id,
        AIST_SKILL_LABEL: skill.label,
        AIST_SKILL_INPUT: input
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

    child.stdin.end(input);
    timeout.unref();
  });
}

function normalizeSkill(value: unknown, fallbackScope: AgentItemScope): AgentSkill | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const label = typeof record.label === 'string' ? record.label.trim() : '';
  const command = typeof record.command === 'string' ? record.command.trim() : '';

  if (!id || !label || !command) {
    return undefined;
  }

  return {
    id,
    label,
    description: typeof record.description === 'string' ? record.description.trim() : '',
    command,
    permission: normalizePermission(record.permission, 'ask'),
    scope: record.scope === 'global' || record.scope === 'local' ? record.scope : fallbackScope
  };
}

function createSkillId(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9\u0400-\u04FF]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'skill'
  );
}

function normalizePermission(value: unknown, fallback: ToolPermissionMode): ToolPermissionMode {
  return value === 'auto' || value === 'ask' ? value : fallback;
}

function readSkills(scope: AgentItemScope): StoredAgentSkill[] | undefined {
  return scope === 'global' ? readGlobalAgentConfig().customSkills : readAgentConfig().customSkills;
}

async function updateSkills(scope: AgentItemScope, skills: AgentSkill[]): Promise<void> {
  const storedSkills = skills.map(stripScopeForStorage);
  if (scope === 'global') {
    await updateGlobalAgentConfig({ customSkills: storedSkills });
    return;
  }

  await updateAgentConfig({ customSkills: storedSkills });
}

function stripScopeForStorage(skill: AgentSkill): StoredAgentSkill {
  const { scope: _scope, ...storedSkill } = skill;
  return storedSkill;
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw createToolError('INVALID_ARGUMENT', `Tool argument "${name}" must be a non-empty string.`, {
      argument: name
    });
  }

  return value.trim();
}

function getProcessFailure(
  ok: boolean,
  timedOut: boolean,
  timeoutError: string,
  exitCode: number | null,
  signal: NodeJS.Signals | null
): Record<string, unknown> {
  if (ok) {
    return {};
  }

  if (timedOut) {
    return {
      code: 'TIMEOUT',
      error: timeoutError
    };
  }

  return {
    code: 'INVALID_ARGUMENT',
    error:
      exitCode === null
        ? `Skill exited without an exit code${signal ? ` after signal ${signal}` : ''}.`
        : `Skill exited with code ${exitCode}.`
  };
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(number)));
}

function appendOutput(current: string, addition: string, maxChars: number): { text: string; truncated: boolean } {
  const next = current + addition;
  if (next.length <= maxChars) {
    return { text: next, truncated: false };
  }

  return { text: next.slice(0, maxChars), truncated: true };
}
