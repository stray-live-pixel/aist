import { runNodeSkillTool, runSkillTool } from '../../core/skills';
import {
  type AgentItemScope,
  readAgentConfig,
  readGlobalAgentConfig,
  updateAgentConfig,
  updateGlobalAgentConfig
} from '../agent/config/agentConfigStore';
import { getWorkspaceFolder } from '../shared/workspace';
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
export { runSkillTool };

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
  if (typeof args.skillId !== 'string' || !args.skillId.trim()) {
    return runNodeSkillTool({
      skills: [],
      workspaceRoot: process.cwd(),
      args
    });
  }

  return runNodeSkillTool({
    skills: getAgentSkills(),
    workspaceRoot: getWorkspaceFolder().uri.fsPath,
    args
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
