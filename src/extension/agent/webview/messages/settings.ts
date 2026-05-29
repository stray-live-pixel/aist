import * as vscode from 'vscode';

import { validateReflectionCandidates } from '../../../../core/features/reflection/reflection';
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
import { setAuxiliaryModelSettings, setAuxiliaryToolModelOverrides } from '../../config/auxiliaryModelSettings';
import { setCompactionSettings } from '../../config/compaction';
import { setComposerUiSettings } from '../../config/composerUi';
import { normalizeCodexServiceTier, normalizeEditorContextMode, normalizeReasoningEffort } from '../../config/config';
import { setApprovalNotificationSettings } from '../../config/notifications';
import { deleteProviderProfile, duplicateProviderProfile, upsertProviderProfile } from '../../config/providerProfiles';
import {
  addAgentMode,
  deleteAgentMode,
  setAgentLanguage,
  setAgentMode,
  setAgentModeInstructions
} from '../../config/settings';
import { type AgentMemoryScope, addAgentMemory, deleteAgentMemory, setAgentMemoryEnabled } from '../../memory/memory';
import type { WebviewMessage } from '../../types';
import type { AgentWebviewMessageDeps } from './types';

type SettingsMessage = Extract<
  WebviewMessage,
  | { type: 'setDefaultModel' }
  | { type: 'setMaxToolIterations' }
  | { type: 'setReasoningEffort' }
  | { type: 'setCodexServiceTier' }
  | { type: 'setEditorContextMode' }
  | { type: 'setStreamingEnabled' }
  | { type: 'upsertProviderProfile' }
  | { type: 'duplicateProviderProfile' }
  | { type: 'deleteProviderProfile' }
  | { type: 'setAuxiliaryModelSettings' }
  | { type: 'setAuxiliaryToolModelOverrides' }
  | { type: 'setCompactionSettings' }
  | { type: 'setApprovalNotificationSettings' }
  | { type: 'setComposerUiSettings' }
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
  | { type: 'setMemoryEnabled' }
  | { type: 'deleteMemory' }
  | { type: 'saveReflectionCandidate' }
  | { type: 'rejectReflectionCandidate' }
>;

export function isSettingsMessage(message: WebviewMessage): message is SettingsMessage {
  return [
    'setDefaultModel',
    'setMaxToolIterations',
    'setReasoningEffort',
    'setCodexServiceTier',
    'setEditorContextMode',
    'setStreamingEnabled',
    'upsertProviderProfile',
    'duplicateProviderProfile',
    'deleteProviderProfile',
    'setAuxiliaryModelSettings',
    'setAuxiliaryToolModelOverrides',
    'setCompactionSettings',
    'setApprovalNotificationSettings',
    'setComposerUiSettings',
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
    'deletePromptPreset',
    'setMemoryEnabled',
    'deleteMemory',
    'saveReflectionCandidate',
    'rejectReflectionCandidate'
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
    case 'setDefaultModel':
      await updateWorkspaceSetting('model', message.model);
      deps.sendState();
      return;
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
    case 'setCodexServiceTier':
      await updateWorkspaceSetting('codexServiceTier', normalizeCodexServiceTier(message.codexServiceTier));
      deps.sendState();
      return;
    case 'setEditorContextMode':
      await updateWorkspaceSetting('editorContextMode', normalizeEditorContextMode(message.editorContextMode));
      deps.sendState();
      return;
    case 'setStreamingEnabled':
      await updateWorkspaceSetting('streamingEnabled', message.streamingEnabled === true);
      deps.sendState();
      return;
    case 'upsertProviderProfile':
      await upsertProviderProfile(message.profile);
      deps.sendState();
      return;
    case 'duplicateProviderProfile':
      await duplicateProviderProfile(message.profileId);
      deps.sendState();
      return;
    case 'deleteProviderProfile':
      await deleteProviderProfile(message.profileId);
      deps.sendState();
      return;
    case 'setAuxiliaryModelSettings':
      await setAuxiliaryModelSettings(message.id, message.settings);
      deps.sendState();
      return;
    case 'setAuxiliaryToolModelOverrides':
      await setAuxiliaryToolModelOverrides(message.overrides);
      deps.sendState();
      return;
    case 'setCompactionSettings':
      await setCompactionSettings(message.settings);
      deps.sendState();
      return;
    case 'setApprovalNotificationSettings':
      await setApprovalNotificationSettings(message.settings);
      deps.sendState();
      return;
    case 'setComposerUiSettings':
      await setComposerUiSettings(message.settings);
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
    case 'setMemoryEnabled':
      await setAgentMemoryEnabled(message.scope, message.id, message.enabled);
      deps.sendState();
      return;
    case 'deleteMemory':
      await deleteAgentMemory(message.scope, message.id);
      deps.sendState();
      return;
    case 'saveReflectionCandidate':
      await saveReflectionCandidate(message.chatId, message.candidateId, deps);
      deps.sendState();
      return;
    case 'rejectReflectionCandidate':
      deps.chats.setReflectionCandidateStatus(message.chatId, message.candidateId, 'rejected');
      deps.sendState();
      return;
  }
}

async function saveReflectionCandidate(
  chatId: string,
  candidateId: string,
  deps: AgentWebviewMessageDeps
): Promise<void> {
  const chat = deps.chats.getChat(chatId);
  const candidate = chat?.reflectionCandidates?.find((item) => item.id === candidateId && item.status === 'pending');
  const validated = validateReflectionCandidates(candidate ? [candidate] : [])[0];
  if (!candidate || !validated) {
    deps.chats.setReflectionCandidateStatus(chatId, candidateId, 'rejected');
    return;
  }

  await addAgentMemory({
    scope: getReflectionMemoryScope(validated),
    note: getReflectionMemoryNote(validated)
  });

  deps.chats.setReflectionCandidateStatus(chatId, candidateId, 'saved');
}

function getReflectionMemoryScope(
  candidate: NonNullable<ReturnType<typeof validateReflectionCandidates>[number]>
): AgentMemoryScope {
  return candidate.kind === 'memory_preference' && candidate.scope === 'global' ? 'global' : 'project';
}

function getReflectionMemoryNote(
  candidate: NonNullable<ReturnType<typeof validateReflectionCandidates>[number]>
): string {
  if (candidate.kind === 'verification_command') {
    return `Verification command: ${candidate.content}`;
  }
  if (candidate.kind === 'declarative_definition') {
    return `Possible declarative definition: ${candidate.content}`;
  }

  return candidate.content;
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
