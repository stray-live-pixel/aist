import * as vscode from 'vscode';

import {
  type AgentItemRef,
  applyPromptPreset,
  deletePromptItem,
  getPromptConfig,
  setActivePromptConfig,
  upsertPromptItem
} from './agentConfigStore';
import type { AgentLanguage } from './prompts';

export type AgentModeId = string;

export type AgentMode = {
  id: AgentModeId;
  label: string;
  instructions: string;
};

export const DEFAULT_AGENT_MODES: AgentMode[] = [
  {
    id: 'global:coder',
    label: 'Coder',
    instructions:
      'Act as an implementation-focused coding agent. Make direct code changes, keep the scope tight, and mention changed files in the final answer.'
  },
  {
    id: 'global:architect',
    label: 'Architect',
    instructions:
      'Act as a software architect. Focus on design, trade-offs, risks, boundaries, and a clear implementation plan before changing code.'
  }
];

export function isDefaultMode(_modeId: string): boolean {
  return false;
}

export function getAgentLanguage(): AgentLanguage {
  const value = vscode.workspace.getConfiguration('openrouterAgent').get<string>('language');
  return value === 'ru' ? 'ru' : 'en';
}

export function getAgentMode(): AgentModeId {
  return refToModeId(getPromptConfig().activeModeRef) || getAgentModes()[0]?.id || 'global:coder';
}

export function getAgentModes(): AgentMode[] {
  const config = getPromptConfig();
  const modes = [...config.globalModes, ...config.localModes].map((mode) => ({
    id: refToModeId({ scope: mode.scope, id: mode.id }),
    label: `Mode · ${mode.scope === 'global' ? 'Global' : 'Project'} · ${mode.label}`,
    instructions: mode.instructions
  }));

  const presetModes = config.presets.map((preset) => ({
    id: `preset:${preset.id}`,
    label: `Preset with instructions · ${preset.label}`,
    instructions: preset.instructionRefs.length
      ? `Preset with ${preset.instructionRefs.length} instruction(s).`
      : 'Preset without additional instructions.'
  }));

  return [...modes, ...presetModes];
}

export function getActiveAgentMode(): AgentMode {
  const modeId = getAgentMode();
  const modes = getAgentModes();
  return modes.find((mode) => mode.id === modeId) || modes[0] || DEFAULT_AGENT_MODES[0];
}

export async function setAgentLanguage(language: AgentLanguage): Promise<void> {
  await vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('language', language === 'en' ? 'en' : 'ru', vscode.ConfigurationTarget.Workspace);
}

export async function setAgentMode(modeId: AgentModeId): Promise<void> {
  if (modeId.startsWith('preset:')) {
    await applyPromptPreset(modeId.slice('preset:'.length));
    return;
  }

  const ref = modeIdToRef(modeId);
  if (!ref) return;
  const config = getPromptConfig();
  await setActivePromptConfig({
    instructionRefs: config.activeInstructionRefs,
    modeRef: ref,
    presetId: undefined
  });
}

export async function setAgentModeInstructions(modeId: AgentModeId, instructions: string): Promise<void> {
  const ref = modeIdToRef(modeId);
  if (!ref) return;
  const mode = [...getPromptConfig().globalModes, ...getPromptConfig().localModes].find(
    (item) => item.scope === ref.scope && item.id === ref.id
  );
  if (!mode) return;
  await upsertPromptItem({ scope: ref.scope, kind: 'mode', id: ref.id, label: mode.label, content: instructions });
}

export async function addAgentMode(label: string, instructions: string): Promise<AgentMode> {
  await upsertPromptItem({ scope: 'local', kind: 'mode', label, content: instructions });
  const mode = getPromptConfig().localModes.at(-1) || getPromptConfig().globalModes.at(-1);
  return {
    id: mode ? refToModeId({ scope: mode.scope, id: mode.id }) : 'local:mode',
    label,
    instructions
  };
}

export async function deleteAgentMode(modeId: string): Promise<boolean> {
  const ref = modeIdToRef(modeId);
  if (!ref) return false;
  await deletePromptItem(ref.scope, 'mode', ref.id);
  return true;
}

function refToModeId(ref: AgentItemRef | undefined): string {
  return ref ? `${ref.scope}:${ref.id}` : '';
}

function modeIdToRef(modeId: string): AgentItemRef | undefined {
  const [scope, ...rest] = modeId.split(':');
  const id = rest.join(':');
  if ((scope === 'global' || scope === 'local') && id) {
    return { scope, id };
  }
  return undefined;
}
