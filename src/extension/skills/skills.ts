import { spawn } from 'node:child_process';
import * as vscode from 'vscode';

import { readAgentConfig, updateAgentConfig } from '../agent/config/agentConfigStore';
import type { OpenRouterTool } from '../openrouter/types';
import { getErrorMessage } from '../shared/errors';
import { resolveWorkspacePath } from '../shared/workspace';
import type { ToolPermissionMode } from '../tools/permissions';

export type AgentSkill = {
  id: string;
  label: string;
  description: string;
  command: string;
  permission: ToolPermissionMode;
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
          description: 'Maximum stdout/stderr characters to return per stream. Default is 20000.'
        }
      },
      required: ['reason', 'skillId'],
      additionalProperties: false
    }
  }
};

export function getAgentSkills(): AgentSkill[] {
  const raw = readAgentConfig().customSkills;
  if (!Array.isArray(raw)) {
    return [];
  }

  const skills: AgentSkill[] = [];
  const usedIds = new Set<string>();

  for (const item of raw) {
    const skill = normalizeSkill(item);
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
  label: string;
  description: string;
  command: string;
  permission?: ToolPermissionMode;
}): Promise<AgentSkill> {
  const skills = getAgentSkills();
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
    permission: normalizePermission(input.permission, 'ask')
  };

  await updateSkills([...skills, skill]);
  return skill;
}

export async function updateAgentSkill(skillId: string, patch: Partial<Omit<AgentSkill, 'id'>>): Promise<boolean> {
  const skills = getAgentSkills();
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

  await updateSkills(next);
  return true;
}

export async function deleteAgentSkill(skillId: string): Promise<boolean> {
  const skills = getAgentSkills();
  const next = skills.filter((skill) => skill.id !== skillId);

  if (next.length === skills.length) {
    return false;
  }

  await updateSkills(next);
  return true;
}

export async function runAgentSkill(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const skillId = requireString(args.skillId, 'skillId');
  const skill = getAgentSkill(skillId);
  if (!skill) {
    throw new Error(`Unknown skill: ${skillId}`);
  }

  if (!skill.command.trim()) {
    throw new Error(`Skill "${skill.label}" has no command.`);
  }

  const input = typeof args.input === 'string' ? args.input : '';
  const cwd = typeof args.cwd === 'string' && args.cwd.trim() ? args.cwd : '.';
  const cwdUri = resolveWorkspacePath(cwd);
  const stat = await vscode.workspace.fs.stat(cwdUri);
  if (stat.type !== vscode.FileType.Directory) {
    throw new Error(`cwd must point to a workspace directory: ${cwd}`);
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
        ok: false,
        skillId: skill.id,
        label: skill.label,
        cwd,
        error: getErrorMessage(error),
        durationMs: Date.now() - startedAt
      });
    });

    child.on('close', (exitCode, signal) => {
      closed = true;
      clearTimeout(timeout);
      resolve({
        ok: exitCode === 0 && !timedOut,
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

function normalizeSkill(value: unknown): AgentSkill | undefined {
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
    permission: normalizePermission(record.permission, 'ask')
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

async function updateSkills(skills: AgentSkill[]): Promise<void> {
  await updateAgentConfig({ customSkills: skills });
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Tool argument "${name}" must be a non-empty string.`);
  }

  return value.trim();
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
