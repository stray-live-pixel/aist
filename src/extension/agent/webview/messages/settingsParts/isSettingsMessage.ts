import { type WebviewMessage } from '../../../types';
import { SettingsMessage } from './SettingsMessage';

export function isSettingsMessage(message: WebviewMessage): message is SettingsMessage {
  return [
    'setDefaultModel',
    'setMaxToolIterations',
    'setReasoningEffort',
    'setCodexServiceTier',
    'setEditorContextMode',
    'setStreamingEnabled',
    'setToolCallNotesRequired',
    'setVcsCommand',
    'upsertProviderProfile',
    'setProviderProfileApiKey',
    'duplicateProviderProfile',
    'deleteProviderProfile',
    'setAuxiliaryModelSettings',
    'setAuxiliaryToolModelOverrides',
    'setCompactionSettings',
    'setApprovalNotificationSettings',
    'setComposerUiSettings',
    'setMemorySettings',
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
