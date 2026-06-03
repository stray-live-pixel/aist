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
} from '../../../config/agentConfigStore';
import { setAuxiliaryModelSettings, setAuxiliaryToolModelOverrides } from '../../../config/auxiliaryModelSettings';
import { setCompactionSettings } from '../../../config/compaction';
import { setComposerUiSettings } from '../../../config/composerUi';
import {
  normalizeCodexServiceTier,
  normalizeEditorContextMode,
  normalizeReasoningEffort
} from '../../../config/config';
import { setApprovalNotificationSettings } from '../../../config/notifications';
import {
  deleteProviderProfile,
  duplicateProviderProfile,
  upsertProviderProfile
} from '../../../config/providerProfiles';
import { setAgentLanguage, setAgentMode } from '../../../config/settings';
import { setToolCallNotesRequired } from '../../../config/toolCallNotes';
import { setVcsCommand } from '../../../config/vcs';
import { deleteAgentMemory, setAgentMemoryEnabled } from '../../../memory/memory';
import { type AgentWebviewMessageDeps } from '../types';
import { SettingsMessage } from './SettingsMessage';
import { createAgentMode } from './createAgentMode';
import { removeAgentMode } from './removeAgentMode';
import { saveAgentModeInstructions } from './saveAgentModeInstructions';
import { saveProviderProfileApiKeyFromMessage } from './saveProviderProfileApiKeyFromMessage';
import { updateWorkspaceSetting } from './updateWorkspaceSetting';

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
    case 'setToolCallNotesRequired':
      await setToolCallNotesRequired({ required: message.required === true });
      deps.sendState();
      return;
    case 'setVcsCommand':
      await setVcsCommand({ command: message.command });
      deps.sendState();
      return;
    case 'upsertProviderProfile':
      await upsertProviderProfile(message.profile);
      deps.sendState();
      return;
    case 'setProviderProfileApiKey':
      await saveProviderProfileApiKeyFromMessage(message.profileId, message.apiKey, deps);
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
      await deps.saveReflectionCandidate(message.chatId, message.candidateId);
      deps.sendState();
      return;
    case 'rejectReflectionCandidate':
      await deps.rejectReflectionCandidate(message.chatId, message.candidateId);
      deps.sendState();
      return;
  }
}
