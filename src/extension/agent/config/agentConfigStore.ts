import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as vscode from 'vscode';

import { getWorkspaceFolder } from '../../shared/workspace';
import type { AgentSkill } from '../../skills/skills';
import type { CompactionSettings } from './compaction';
import type { AgentMode } from './settings';

export type AgentConfigScope = 'workspace' | 'user';
export type AgentItemScope = 'global' | 'local';
export type AgentInstructionKind = 'instruction' | 'mode';

export type AgentItemRef = {
  scope: AgentItemScope;
  id: string;
};

export type AgentInstructionItem = {
  id: string;
  label: string;
  content: string;
  scope: AgentItemScope;
  kind: 'instruction';
};

export type AgentModeItem = {
  id: string;
  label: string;
  instructions: string;
  scope: AgentItemScope;
  kind: 'mode';
};

export type AgentPromptPreset = {
  id: string;
  label: string;
  instructionRefs: AgentItemRef[];
  modeRef?: AgentItemRef;
};

export type AgentPromptConfig = {
  globalInstructions: AgentInstructionItem[];
  localInstructions: AgentInstructionItem[];
  globalModes: AgentModeItem[];
  localModes: AgentModeItem[];
  presets: AgentPromptPreset[];
  activeInstructionRefs: AgentItemRef[];
  activeModeRef?: AgentItemRef;
  activePresetId?: string;
};

export type AgentInstructionSource = {
  id: string;
  title: string;
  content: string;
  priority: number;
  kind: 'base' | 'file' | 'mode' | 'custom' | 'skills';
};

type StoredInstructionItem = {
  id: string;
  label: string;
  content: string;
};

type StoredModeItem = {
  id: string;
  label: string;
  instructions: string;
};

type StoredAgentConfig = {
  projectInstructions?: string;
  customModes?: AgentMode[];
  modeInstructions?: Record<string, string>;
  customSkills?: AgentSkill[];
  compaction?: Partial<CompactionSettings>;
  instructions?: StoredInstructionItem[];
  modes?: StoredModeItem[];
  presets?: AgentPromptPreset[];
  activeInstructionRefs?: AgentItemRef[];
  activeModeRef?: AgentItemRef;
  activePresetId?: string;
};

const DEFAULT_GLOBAL_INSTRUCTIONS: StoredInstructionItem[] = [
  {
    id: 'practical-coding',
    label: 'Practical coding',
    content:
      'Work briefly and practically. Before editing, inspect relevant files and preserve the existing project style.'
  },
  {
    id: 'safe-changes',
    label: 'Safe changes',
    content:
      'Prefer small focused changes. Ask or explain before risky operations. After edits, verify once when it is useful.'
  }
];

const DEFAULT_GLOBAL_MODES: StoredModeItem[] = [
  {
    id: 'coder',
    label: 'Coder',
    instructions:
      'Act as an implementation-focused coding agent. Make direct code changes, keep the scope tight, and mention changed files in the final answer.'
  },
  {
    id: 'architect',
    label: 'Architect',
    instructions:
      'Act as a software architect. Focus on design, trade-offs, risks, boundaries, and a clear implementation plan before changing code.'
  }
];

const DEFAULT_PRESETS: AgentPromptPreset[] = [
  {
    id: 'coding',
    label: 'Coding',
    instructionRefs: [
      { scope: 'global', id: 'practical-coding' },
      { scope: 'global', id: 'safe-changes' }
    ],
    modeRef: { scope: 'global', id: 'coder' }
  },
  {
    id: 'design',
    label: 'Design',
    instructionRefs: [{ scope: 'global', id: 'practical-coding' }],
    modeRef: { scope: 'global', id: 'architect' }
  }
];

/**
 * Что это: файловое хранилище agent-настроек.
 * Зачем нужно: глобальные инструкции живут в `~/.aist-agent/settings.json`,
 * а настройки конкретного проекта — в `.aist-agent/settings.json`.
 */
export function initializeAgentConfigStore(_context: vscode.ExtensionContext): void {
  ensureGlobalDefaults();
}

export function getAgentConfigScope(): AgentConfigScope {
  return 'workspace';
}

export async function setAgentConfigScope(_scope: AgentConfigScope): Promise<void> {
  // Kept for backward compatibility with old webview messages. New instruction
  // management always uses global ~/.aist-agent and local .aist-agent stores.
}

export function readAgentConfig(): StoredAgentConfig {
  return readJsonConfig(getWorkspaceConfigPath());
}

export async function updateAgentConfig(patch: Partial<StoredAgentConfig>): Promise<void> {
  await writeJsonConfig(getWorkspaceConfigPath(), { ...readAgentConfig(), ...patch });
}

export function getPromptConfig(): AgentPromptConfig {
  ensureGlobalDefaults();
  const globalConfig = readGlobalAgentConfig();
  const localConfig = readAgentConfig();
  const globalInstructions = normalizeInstructions(globalConfig.instructions, 'global');
  const localInstructions = normalizeInstructions(localConfig.instructions, 'local');
  const globalModes = normalizeModes(globalConfig.modes, 'global');
  const localModes = normalizeModes(localConfig.modes, 'local');
  const presets = normalizePresets([...(globalConfig.presets || []), ...(localConfig.presets || [])]);
  const fallbackPreset = presets[0];

  return {
    globalInstructions,
    localInstructions,
    globalModes,
    localModes,
    presets,
    activeInstructionRefs: normalizeRefs(
      localConfig.activeInstructionRefs || fallbackPreset?.instructionRefs || [],
      globalInstructions,
      localInstructions
    ),
    activeModeRef: normalizeModeRef(localConfig.activeModeRef || fallbackPreset?.modeRef, globalModes, localModes),
    activePresetId: typeof localConfig.activePresetId === 'string' ? localConfig.activePresetId : fallbackPreset?.id
  };
}

export async function upsertPromptItem(input: {
  scope: AgentItemScope;
  kind: AgentInstructionKind;
  id?: string;
  label: string;
  content: string;
}): Promise<void> {
  const config = readScopedConfig(input.scope);
  const key = input.kind === 'instruction' ? 'instructions' : 'modes';
  const current =
    input.kind === 'instruction'
      ? normalizeStoredInstructions(config.instructions)
      : normalizeStoredModes(config.modes);
  const id =
    input.id ||
    createUniqueId(
      input.label,
      current.map((item) => item.id)
    );
  const label = input.label.trim() || (input.kind === 'instruction' ? 'Instruction' : 'Mode');
  const content = input.content.trim();
  const next = current.some((item) => item.id === id)
    ? current.map((item) =>
        item.id === id
          ? input.kind === 'instruction'
            ? { id, label, content }
            : { id, label, instructions: content }
          : item
      )
    : [...current, input.kind === 'instruction' ? { id, label, content } : { id, label, instructions: content }];

  await writeScopedConfig(input.scope, { ...config, [key]: next });
}

export async function duplicatePromptItem(
  scope: AgentItemScope,
  kind: AgentInstructionKind,
  id: string
): Promise<void> {
  const config = readScopedConfig(scope);
  const key = kind === 'instruction' ? 'instructions' : 'modes';
  const current =
    kind === 'instruction' ? normalizeStoredInstructions(config.instructions) : normalizeStoredModes(config.modes);
  const source = current.find((item) => item.id === id);
  if (!source) return;

  const nextId = createUniqueId(
    `${source.label} copy`,
    current.map((item) => item.id)
  );
  const copy =
    kind === 'instruction'
      ? { id: nextId, label: `${source.label} copy`, content: (source as StoredInstructionItem).content }
      : { id: nextId, label: `${source.label} copy`, instructions: (source as StoredModeItem).instructions };

  await writeScopedConfig(scope, { ...config, [key]: [...current, copy] });
}

export async function deletePromptItem(scope: AgentItemScope, kind: AgentInstructionKind, id: string): Promise<void> {
  const config = readScopedConfig(scope);
  const key = kind === 'instruction' ? 'instructions' : 'modes';
  const current =
    kind === 'instruction' ? normalizeStoredInstructions(config.instructions) : normalizeStoredModes(config.modes);
  const nextConfig: StoredAgentConfig = { ...config, [key]: current.filter((item) => item.id !== id) };

  if (scope === 'local') {
    nextConfig.activeInstructionRefs = (config.activeInstructionRefs || []).filter(
      (ref) => !(ref.scope === scope && ref.id === id)
    );
    if (config.activeModeRef?.scope === scope && config.activeModeRef.id === id) nextConfig.activeModeRef = undefined;
  } else {
    await removeActiveRef({ scope, id }, kind);
  }

  await writeScopedConfig(scope, nextConfig);
}

async function removeActiveRef(ref: AgentItemRef, kind: AgentInstructionKind): Promise<void> {
  const localConfig = readAgentConfig();
  const next: StoredAgentConfig = { ...localConfig };
  if (kind === 'instruction') {
    next.activeInstructionRefs = (localConfig.activeInstructionRefs || []).filter(
      (item) => refKey(item) !== refKey(ref)
    );
  }
  if (kind === 'mode' && localConfig.activeModeRef && refKey(localConfig.activeModeRef) === refKey(ref)) {
    next.activeModeRef = undefined;
  }
  await writeJsonConfig(getWorkspaceConfigPath(), next);
}

export async function setActivePromptConfig(input: {
  instructionRefs: AgentItemRef[];
  modeRef?: AgentItemRef;
  presetId?: string;
}): Promise<void> {
  const localConfig = readAgentConfig();
  await updateAgentConfig({
    ...localConfig,
    activeInstructionRefs: input.instructionRefs,
    activeModeRef: input.modeRef,
    activePresetId: input.presetId
  });
}

export async function applyPromptPreset(presetId: string): Promise<void> {
  const preset = getPromptConfig().presets.find((item) => item.id === presetId);
  if (!preset) return;
  await setActivePromptConfig({
    instructionRefs: preset.instructionRefs,
    modeRef: preset.modeRef,
    presetId: preset.id
  });
}

export async function upsertPromptPreset(
  input: Omit<AgentPromptPreset, 'id'> & { id?: string; scope?: AgentItemScope }
): Promise<void> {
  const scope = input.scope || 'local';
  const config = readScopedConfig(scope);
  const current = normalizePresets(config.presets || []);
  const id =
    input.id ||
    createUniqueId(
      input.label,
      current.map((preset) => preset.id)
    );
  const preset: AgentPromptPreset = {
    id,
    label: input.label.trim() || 'Preset',
    instructionRefs: input.instructionRefs || [],
    modeRef: input.modeRef
  };
  const next = current.some((item) => item.id === id)
    ? current.map((item) => (item.id === id ? preset : item))
    : [...current, preset];
  await writeScopedConfig(scope, { ...config, presets: next });
}

export async function deletePromptPreset(presetId: string): Promise<void> {
  const localConfig = readAgentConfig();
  const globalConfig = readGlobalAgentConfig();
  await writeJsonConfig(getWorkspaceConfigPath(), {
    ...localConfig,
    presets: normalizePresets(localConfig.presets || []).filter((item) => item.id !== presetId),
    activePresetId: localConfig.activePresetId === presetId ? undefined : localConfig.activePresetId
  });
  await writeJsonConfig(getGlobalConfigPath(), {
    ...globalConfig,
    presets: normalizePresets(globalConfig.presets || []).filter((item) => item.id !== presetId)
  });
}

export function getExternalInstructionSources(): AgentInstructionSource[] {
  return [readInstructionFile('AGENTS.md', 20), readInstructionFile('CLAUDE.md', 30)].filter(
    Boolean
  ) as AgentInstructionSource[];
}

export function getProjectInstructions(): string {
  return getPromptConfig()
    .localInstructions.map((item) => item.content)
    .join('\n\n');
}

export async function setProjectInstructions(instructions: string): Promise<void> {
  await upsertPromptItem({
    scope: 'local',
    kind: 'instruction',
    id: 'project-instructions',
    label: 'Project instructions',
    content: instructions
  });
}

function readGlobalAgentConfig(): StoredAgentConfig {
  ensureGlobalDefaults();
  return readJsonConfig(getGlobalConfigPath());
}

function readScopedConfig(scope: AgentItemScope): StoredAgentConfig {
  return scope === 'global' ? readGlobalAgentConfig() : readAgentConfig();
}

async function writeScopedConfig(scope: AgentItemScope, config: StoredAgentConfig): Promise<void> {
  await writeJsonConfig(scope === 'global' ? getGlobalConfigPath() : getWorkspaceConfigPath(), config);
}

function ensureGlobalDefaults(): void {
  const filePath = getGlobalConfigPath();
  if (fs.existsSync(filePath)) return;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${JSON.stringify(
      {
        instructions: DEFAULT_GLOBAL_INSTRUCTIONS,
        modes: DEFAULT_GLOBAL_MODES,
        presets: DEFAULT_PRESETS
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}

function readJsonConfig(filePath: string): StoredAgentConfig {
  if (!fs.existsSync(filePath)) return {};

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as StoredAgentConfig;
  } catch (error) {
    console.error('[aist] Failed to read agent config', error);
    return {};
  }
}

async function writeJsonConfig(filePath: string, config: StoredAgentConfig): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function readInstructionFile(fileName: string, priority: number): AgentInstructionSource | undefined {
  try {
    const filePath = path.join(getWorkspaceFolder().uri.fsPath, fileName);
    if (!fs.existsSync(filePath)) return undefined;

    const content = fs.readFileSync(filePath, 'utf8').trim();
    return content ? { id: fileName, title: fileName, content, priority, kind: 'file' } : undefined;
  } catch {
    return undefined;
  }
}

function getWorkspaceConfigPath(): string {
  return path.join(getWorkspaceFolder().uri.fsPath, '.aist-agent', 'settings.json');
}

function getGlobalConfigPath(): string {
  return path.join(os.homedir(), '.aist-agent', 'settings.json');
}

function normalizeInstructions(raw: unknown, scope: AgentItemScope): AgentInstructionItem[] {
  return normalizeStoredInstructions(raw).map((item) => ({ ...item, scope, kind: 'instruction' }));
}

function normalizeModes(raw: unknown, scope: AgentItemScope): AgentModeItem[] {
  return normalizeStoredModes(raw).map((item) => ({ ...item, scope, kind: 'mode' }));
}

function normalizeStoredInstructions(raw: unknown): StoredInstructionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => item as Record<string, unknown>)
    .filter((item) => typeof item.id === 'string' && typeof item.label === 'string')
    .map((item) => ({
      id: String(item.id),
      label: String(item.label),
      content: typeof item.content === 'string' ? item.content : ''
    }));
}

function normalizeStoredModes(raw: unknown): StoredModeItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => item as Record<string, unknown>)
    .filter((item) => typeof item.id === 'string' && typeof item.label === 'string')
    .map((item) => ({
      id: String(item.id),
      label: String(item.label),
      instructions: typeof item.instructions === 'string' ? item.instructions : ''
    }));
}

function normalizePresets(raw: unknown): AgentPromptPreset[] {
  if (!Array.isArray(raw)) return [];
  const used = new Set<string>();
  const presets: AgentPromptPreset[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : '';
    const label = typeof record.label === 'string' ? record.label : '';
    if (!id || !label || used.has(id)) continue;
    used.add(id);
    presets.push({
      id,
      label,
      instructionRefs: Array.isArray(record.instructionRefs) ? normalizeItemRefs(record.instructionRefs) : [],
      modeRef: normalizeItemRef(record.modeRef)
    });
  }
  return presets;
}

function normalizeRefs(
  refs: AgentItemRef[],
  globalInstructions: AgentInstructionItem[],
  localInstructions: AgentInstructionItem[]
): AgentItemRef[] {
  const all = [...globalInstructions, ...localInstructions];
  return normalizeItemRefs(refs).filter((ref) => all.some((item) => item.scope === ref.scope && item.id === ref.id));
}

function normalizeModeRef(
  ref: AgentItemRef | undefined,
  globalModes: AgentModeItem[],
  localModes: AgentModeItem[]
): AgentItemRef | undefined {
  const normalized = normalizeItemRef(ref);
  if (!normalized) return undefined;
  return [...globalModes, ...localModes].some((item) => item.scope === normalized.scope && item.id === normalized.id)
    ? normalized
    : undefined;
}

function normalizeItemRefs(raw: unknown[]): AgentItemRef[] {
  return raw.map(normalizeItemRef).filter(Boolean) as AgentItemRef[];
}

function refKey(ref: AgentItemRef): string {
  return `${ref.scope}:${ref.id}`;
}

function normalizeItemRef(raw: unknown): AgentItemRef | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const scope = record.scope === 'global' ? 'global' : record.scope === 'local' ? 'local' : undefined;
  const id = typeof record.id === 'string' ? record.id : undefined;
  return scope && id ? { scope, id } : undefined;
}

function createUniqueId(label: string, existingIds: string[]): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9\u0400-\u04FF]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item';
  let id = base;
  let index = 1;
  while (existingIds.includes(id)) {
    id = `${base}-${index}`;
    index += 1;
  }
  return id;
}
