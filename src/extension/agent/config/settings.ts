import * as vscode from 'vscode';

import type { AgentLanguage } from './prompts';

export type AgentModeId = string;

export type AgentMode = {
  id: AgentModeId;
  label: string;
  instructions: string;
};

export const DEFAULT_AGENT_MODES: AgentMode[] = [
  {
    id: 'default',
    label: 'Обычный',
    instructions: 'Работай кратко и практично. Перед изменениями изучай релевантные файлы и сохраняй стиль проекта.'
  },
  {
    id: 'careful',
    label: 'Осторожный',
    instructions:
      'Перед рискованными изменениями явно проверяй контекст. Предпочитай маленькие точечные правки и обязательно объясняй, что было изменено.'
  }
];

const DEFAULT_IDS = new Set<string>(DEFAULT_AGENT_MODES.map((m) => m.id));

export function isDefaultMode(modeId: string): boolean {
  return DEFAULT_IDS.has(modeId);
}

export function getAgentLanguage(): AgentLanguage {
  const value = vscode.workspace.getConfiguration('openrouterAgent').get<string>('language');
  return value === 'en' ? 'en' : 'ru';
}

export function getAgentMode(): AgentModeId {
  const value = vscode.workspace.getConfiguration('openrouterAgent').get<string>('agentMode');
  return value ?? 'default';
}

export function getAgentModes(): AgentMode[] {
  const config = vscode.workspace.getConfiguration('openrouterAgent');

  const instructionsOverrides = config.get<Record<string, unknown>>('agentModeInstructions') || {};

  const customModes = readCustomModes(config);

  const modes: AgentMode[] = DEFAULT_AGENT_MODES.map((mode) => {
    const instructions = instructionsOverrides[mode.id];
    return {
      ...mode,
      instructions: typeof instructions === 'string' ? instructions : mode.instructions
    };
  });

  for (const custom of customModes) {
    if (!DEFAULT_IDS.has(custom.id)) {
      modes.push(custom);
    }
  }

  return modes;
}

export function getActiveAgentMode(): AgentMode {
  const modeId = getAgentMode();
  const modes = getAgentModes();
  return modes.find((mode) => mode.id === modeId) || modes[0];
}

export async function setAgentLanguage(language: AgentLanguage): Promise<void> {
  await vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('language', language === 'en' ? 'en' : 'ru', vscode.ConfigurationTarget.Workspace);
}

export async function setAgentMode(modeId: AgentModeId): Promise<void> {
  // Avoid storing a mode that doesn't exist
  const modes = getAgentModes();
  const target = modes.find((m) => m.id === modeId);
  await vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('agentMode', target ? target.id : 'default', vscode.ConfigurationTarget.Workspace);
}

export async function setAgentModeInstructions(modeId: AgentModeId, instructions: string): Promise<void> {
  const config = vscode.workspace.getConfiguration('openrouterAgent');

  if (isDefaultMode(modeId)) {
    const current = config.get<Record<string, unknown>>('agentModeInstructions') || {};
    await updateGlobal(config, 'agentModeInstructions', { ...current, [modeId]: instructions });
  } else {
    const customModes = readCustomModes(config);
    const updated = customModes.map((m) => (m.id === modeId ? { ...m, instructions } : m));
    await updateGlobal(config, 'customAgentModes', updated);
  }
}

export async function addAgentMode(label: string, instructions: string): Promise<AgentMode> {
  const config = vscode.workspace.getConfiguration('openrouterAgent');
  const customModes = readCustomModes(config);

  const baseId =
    label
      .toLowerCase()
      .replace(/[^a-z0-9\u0400-\u04FF]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'custom';

  let id = baseId;
  let counter = 1;
  const allModes = getAgentModes();
  while (allModes.some((m) => m.id === id) || customModes.some((m) => m.id === id)) {
    id = `${baseId}-${counter}`;
    counter++;
  }

  const mode: AgentMode = { id, label, instructions };
  const next = [...customModes, mode];

  await updateGlobal(config, 'customAgentModes', next);
  return mode;
}

export async function deleteAgentMode(modeId: string): Promise<boolean> {
  if (isDefaultMode(modeId)) {
    return false;
  }

  const config = vscode.workspace.getConfiguration('openrouterAgent');
  const customModes = readCustomModes(config);
  const filtered = customModes.filter((m) => m.id !== modeId);

  if (filtered.length === customModes.length) {
    return false;
  }

  await updateGlobal(config, 'customAgentModes', filtered);

  const activeId = getAgentMode();
  if (activeId === modeId) {
    await setAgentMode('default');
  }

  return true;
}

function readCustomModes(config: vscode.WorkspaceConfiguration): AgentMode[] {
  const raw = config.get<unknown>('customAgentModes');
  if (!Array.isArray(raw)) {
    return [];
  }

  const modes: AgentMode[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === 'object' &&
      typeof (item as AgentMode).id === 'string' &&
      typeof (item as AgentMode).label === 'string' &&
      typeof (item as AgentMode).instructions === 'string'
    ) {
      modes.push(item as AgentMode);
    }
  }
  return modes;
}

async function updateGlobal(config: vscode.WorkspaceConfiguration, key: string, value: unknown): Promise<void> {
  try {
    await config.update(key, value, vscode.ConfigurationTarget.Global);
  } catch (error) {
    console.error(`[aist] Failed to save '${key}' to Global settings`, error);
    throw error;
  }
}
