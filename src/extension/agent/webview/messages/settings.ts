import * as vscode from 'vscode';

import { getErrorMessage } from '../../../shared/errors';
import { t } from '../../../shared/i18n';
import {
  applyPromptPreset,
  deletePromptItem,
  deletePromptPreset,
  duplicatePromptItem,
  setActivePromptConfig,
  setAgentConfigScope,
  setProjectInstructions,
  upsertPromptItem,
  upsertPromptPreset
} from '../../config/agentConfigStore';
import { setCompactionSettings } from '../../config/compaction';
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
  | { type: 'setCompactionSettings' }
  | { type: 'setAgentLanguage' }
  | { type: 'setAgentMode' }
  | { type: 'setAgentModeInstructions' }
  | { type: 'setAgentConfigScope' }
  | { type: 'setProjectInstructions' }
  | { type: 'addAgentMode' }
  | { type: 'deleteAgentMode' }
  | { type: 'upsertPromptItem' }
  | { type: 'duplicatePromptItem' }
  | { type: 'deletePromptItem' }
  | { type: 'setActivePromptConfig' }
  | { type: 'applyPromptPreset' }
  | { type: 'upsertPromptPreset' }
  | { type: 'deletePromptPreset' }
>;

export function isSettingsMessage(message: WebviewMessage): message is SettingsMessage {
  return [
    'setMaxToolIterations',
    'setReasoningEffort',
    'setCompactionSettings',
    'setAgentLanguage',
    'setAgentMode',
    'setAgentModeInstructions',
    'setAgentConfigScope',
    'setProjectInstructions',
    'addAgentMode',
    'deleteAgentMode',
    'upsertPromptItem',
    'duplicatePromptItem',
    'deletePromptItem',
    'setActivePromptConfig',
    'applyPromptPreset',
    'upsertPromptPreset',
    'deletePromptPreset'
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
    case 'setCompactionSettings':
      await setCompactionSettings(message.settings);
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
    case 'upsertPromptItem':
      await upsertPromptItem(message);
      deps.sendState();
      return;
    case 'duplicatePromptItem':
      await duplicatePromptItem(message.scope, message.kind, message.id);
      deps.sendState();
      return;
    case 'deletePromptItem':
      await deletePromptItem(message.scope, message.kind, message.id);
      deps.sendState();
      return;
    case 'setActivePromptConfig':
      await setActivePromptConfig(message);
      deps.sendState();
      return;
    case 'applyPromptPreset':
      await applyPromptPreset(message.presetId);
      deps.sendState();
      return;
    case 'upsertPromptPreset':
      await upsertPromptPreset(message);
      deps.sendState();
      return;
    case 'deletePromptPreset':
      await deletePromptPreset(message.presetId);
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
    vscode.window.showErrorMessage(t('error.saveAgentModeInstructions', { error: getErrorMessage(error) }));
  }
}

async function createAgentMode(label: string, instructions: string, deps: AgentWebviewMessageDeps): Promise<void> {
  try {
    const mode = await addAgentMode(label, instructions);
    deps.logger.info('Agent mode added', { id: mode.id, label: mode.label });
    await setAgentMode(mode.id);
  } catch (error) {
    deps.logger.error('Failed to add agent mode', error);
    vscode.window.showErrorMessage(t('error.addAgentMode', { error: getErrorMessage(error) }));
  }
}

async function removeAgentMode(modeId: string, deps: AgentWebviewMessageDeps): Promise<void> {
  try {
    const deleted = await deleteAgentMode(modeId);
    deps.logger.info('Agent mode delete attempted', { modeId, deleted });
  } catch (error) {
    deps.logger.error('Failed to delete agent mode', error);
    vscode.window.showErrorMessage(t('error.deleteAgentMode', { error: getErrorMessage(error) }));
  }
}
