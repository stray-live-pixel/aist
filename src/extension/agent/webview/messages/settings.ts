import * as vscode from 'vscode';

import { getErrorMessage } from '../../../shared/errors';
import { setAgentConfigScope, setProjectInstructions } from '../../config/agentConfigStore';
import { normalizeReasoningEffort } from '../../config/config';
import {
  addAgentMode,
  deleteAgentMode,
  setAgentLanguage,
  setAgentMode,
  setAgentModeInstructions
} from '../../config/settings';
import type { WebviewMessage } from '../../types';
import type { AgentWebviewMessageDeps } from './types';

type SettingsMessage = Extract<
  WebviewMessage,
  | { type: 'setMaxToolIterations' }
  | { type: 'setReasoningEffort' }
  | { type: 'setAgentLanguage' }
  | { type: 'setAgentMode' }
  | { type: 'setAgentModeInstructions' }
  | { type: 'setAgentConfigScope' }
  | { type: 'setProjectInstructions' }
  | { type: 'addAgentMode' }
  | { type: 'deleteAgentMode' }
>;

export function isSettingsMessage(message: WebviewMessage): message is SettingsMessage {
  return [
    'setMaxToolIterations',
    'setReasoningEffort',
    'setAgentLanguage',
    'setAgentMode',
    'setAgentModeInstructions',
    'setAgentConfigScope',
    'setProjectInstructions',
    'addAgentMode',
    'deleteAgentMode'
  ].includes(message.type);
}

/**
 * Обрабатывает настройки агента, приходящие из webview.
 *
 * Настройки могут быть изменены пользователем в UI или напрямую в settings.json,
 * поэтому здесь нормализуются числовые/enum значения и ошибки явно показываются
 * пользователю вместо молчаливого игнорирования.
 */
export async function handleWebviewSettingsMessage(
  message: SettingsMessage,
  deps: AgentWebviewMessageDeps
): Promise<void> {
  switch (message.type) {
    case 'setMaxToolIterations':
      await updateWorkspaceSetting(
        'maxToolIterations',
        Math.max(0, Math.floor(Number(message.maxToolIterations) || 0))
      );
      deps.sendState();
      return;
    case 'setReasoningEffort':
      await updateWorkspaceSetting('reasoningEffort', normalizeReasoningEffort(message.reasoningEffort));
      deps.sendState();
      return;
    case 'setAgentLanguage':
      await setAgentLanguage(message.language);
      deps.sendState();
      return;
    case 'setAgentMode':
      await setAgentMode(message.modeId);
      deps.sendState();
      return;
    case 'setAgentModeInstructions':
      await saveAgentModeInstructions(message.modeId, message.instructions, deps);
      deps.sendState();
      return;
    case 'setAgentConfigScope':
      await setAgentConfigScope(message.scope);
      deps.sendState();
      return;
    case 'setProjectInstructions':
      await setProjectInstructions(message.instructions);
      deps.sendState();
      return;
    case 'addAgentMode':
      await createAgentMode(message.label, message.instructions, deps);
      deps.sendState();
      return;
    case 'deleteAgentMode':
      await removeAgentMode(message.modeId, deps);
      deps.sendState();
      return;
  }
}

function updateWorkspaceSetting(key: string, value: unknown): Thenable<void> {
  return vscode.workspace.getConfiguration('openrouterAgent').update(key, value, vscode.ConfigurationTarget.Workspace);
}

async function saveAgentModeInstructions(
  modeId: string,
  instructions: string,
  deps: AgentWebviewMessageDeps
): Promise<void> {
  try {
    await setAgentModeInstructions(modeId, instructions);
  } catch (error) {
    deps.logger.error('Failed to update agent mode instructions', error);
    vscode.window.showErrorMessage(`aist: failed to save agent mode instructions — ${getErrorMessage(error)}`);
  }
}

async function createAgentMode(label: string, instructions: string, deps: AgentWebviewMessageDeps): Promise<void> {
  try {
    const mode = await addAgentMode(label, instructions);
    deps.logger.info('Agent mode added', { id: mode.id, label: mode.label });
    await setAgentMode(mode.id);
  } catch (error) {
    deps.logger.error('Failed to add agent mode', error);
    vscode.window.showErrorMessage(`aist: failed to add agent mode — ${getErrorMessage(error)}`);
  }
}

async function removeAgentMode(modeId: string, deps: AgentWebviewMessageDeps): Promise<void> {
  try {
    const deleted = await deleteAgentMode(modeId);
    deps.logger.info('Agent mode delete attempted', { modeId, deleted });
  } catch (error) {
    deps.logger.error('Failed to delete agent mode', error);
    vscode.window.showErrorMessage(`aist: failed to delete agent mode — ${getErrorMessage(error)}`);
  }
}
