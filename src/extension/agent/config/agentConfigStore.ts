import fs from 'node:fs';
import path from 'node:path';
import * as vscode from 'vscode';

import { getWorkspaceFolder } from '../../shared/workspace';
import type { AgentSkill } from '../../skills/skills';
import type { AgentMode } from './settings';

export type AgentConfigScope = 'workspace' | 'user';

export type AgentInstructionSource = {
  id: string;
  title: string;
  content: string;
  priority: number;
  kind: 'base' | 'file' | 'mode' | 'custom' | 'skills';
};

type StoredAgentConfig = {
  projectInstructions?: string;
  customModes?: AgentMode[];
  modeInstructions?: Record<string, string>;
  customSkills?: AgentSkill[];
};

let extensionContext: vscode.ExtensionContext | undefined;

/**
 * Что это: файловое хранилище agent-настроек.
 * Зачем нужно: настройки можно держать в репозитории `.aist-agent/settings.json`
 * или локально в пользовательской папке VS Code extension.
 * Пример: readAgentConfig().projectInstructions вернёт инструкции активного scope.
 */
export function initializeAgentConfigStore(context: vscode.ExtensionContext): void {
  extensionContext = context;
}

export function getAgentConfigScope(): AgentConfigScope {
  const value = vscode.workspace.getConfiguration('openrouterAgent').get<string>('agentConfigScope');
  return value === 'user' ? 'user' : 'workspace';
}

export async function setAgentConfigScope(scope: AgentConfigScope): Promise<void> {
  await vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('agentConfigScope', scope, vscode.ConfigurationTarget.Workspace);
}

export function readAgentConfig(): StoredAgentConfig {
  const filePath = getAgentConfigPath();
  if (!fs.existsSync(filePath)) return {};

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as StoredAgentConfig;
  } catch (error) {
    console.error('[aist] Failed to read agent config', error);
    return {};
  }
}

export async function updateAgentConfig(patch: Partial<StoredAgentConfig>): Promise<void> {
  const current = readAgentConfig();
  const next = { ...current, ...patch };
  const filePath = getAgentConfigPath();

  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
}

export function getExternalInstructionSources(): AgentInstructionSource[] {
  return [readInstructionFile('AGENTS.md', 20), readInstructionFile('CLAUDE.md', 30)].filter(
    Boolean
  ) as AgentInstructionSource[];
}

export function getProjectInstructions(): string {
  return readAgentConfig().projectInstructions?.trim() || '';
}

export async function setProjectInstructions(instructions: string): Promise<void> {
  await updateAgentConfig({ projectInstructions: instructions });
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

function getAgentConfigPath(): string {
  return getAgentConfigScope() === 'workspace' ? getWorkspaceConfigPath() : getUserConfigPath();
}

function getWorkspaceConfigPath(): string {
  return path.join(getWorkspaceFolder().uri.fsPath, '.aist-agent', 'settings.json');
}

function getUserConfigPath(): string {
  if (!extensionContext) {
    throw new Error('Agent config store is not initialized.');
  }

  const workspaceKey = getWorkspaceFolder().uri.fsPath.replace(/[^a-zA-Z0-9._-]+/g, '-');
  return path.join(extensionContext.globalStorageUri.fsPath, 'agent-configs', `${workspaceKey}.json`);
}
