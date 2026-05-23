import * as vscode from 'vscode';
import type { AgentLanguage } from './prompts';

export type AgentModeId = 'default' | 'careful';

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

export function getAgentLanguage(): AgentLanguage {
  const value = vscode.workspace.getConfiguration('openrouterAgent').get<string>('language');
  return value === 'en' ? 'en' : 'ru';
}

export function getAgentMode(): AgentModeId {
  const value = vscode.workspace.getConfiguration('openrouterAgent').get<string>('agentMode');
  return value === 'careful' ? 'careful' : 'default';
}

export function getAgentModes(): AgentMode[] {
  const configured =
    vscode.workspace.getConfiguration('openrouterAgent').get<Record<string, unknown>>('agentModeInstructions') || {};

  return DEFAULT_AGENT_MODES.map((mode) => {
    const instructions = configured[mode.id];
    return {
      ...mode,
      instructions: typeof instructions === 'string' ? instructions : mode.instructions
    };
  });
}

export function getActiveAgentMode(): AgentMode {
  const modeId = getAgentMode();
  return getAgentModes().find((mode) => mode.id === modeId) || getAgentModes()[0];
}

export async function setAgentLanguage(language: AgentLanguage): Promise<void> {
  await vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('language', language === 'en' ? 'en' : 'ru', vscode.ConfigurationTarget.Workspace);
}

export async function setAgentMode(modeId: AgentModeId): Promise<void> {
  await vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('agentMode', modeId === 'careful' ? 'careful' : 'default', vscode.ConfigurationTarget.Workspace);
}

export async function setAgentModeInstructions(modeId: AgentModeId, instructions: string): Promise<void> {
  const config = vscode.workspace.getConfiguration('openrouterAgent');
  const current = config.get<Record<string, unknown>>('agentModeInstructions') || {};

  await config.update(
    'agentModeInstructions',
    {
      ...current,
      [modeId]: instructions
    },
    vscode.ConfigurationTarget.Workspace
  );
}
