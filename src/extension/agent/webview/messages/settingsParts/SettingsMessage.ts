import { type WebviewMessage } from '../../../types';

export type SettingsMessage = Extract<
  WebviewMessage,
  | { type: 'setDefaultModel' }
  | { type: 'setMaxToolIterations' }
  | { type: 'setReasoningEffort' }
  | { type: 'setCodexServiceTier' }
  | { type: 'setEditorContextMode' }
  | { type: 'setStreamingEnabled' }
  | { type: 'setToolCallNotesRequired' }
  | { type: 'setVcsCommand' }
  | { type: 'upsertProviderProfile' }
  | { type: 'setProviderProfileApiKey' }
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
