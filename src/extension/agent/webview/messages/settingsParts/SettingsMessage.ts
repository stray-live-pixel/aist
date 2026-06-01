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
import { setApprovalNotificationSettings } from '../../../config/notifications';
import {
  deleteProviderProfile,
  duplicateProviderProfile,
  upsertProviderProfile
} from '../../../config/providerProfiles';
import {
  addAgentMode,
  deleteAgentMode,
  setAgentLanguage,
  setAgentMode,
  setAgentModeInstructions
} from '../../../config/settings';
import { type WebviewMessage } from '../../../types';

export type SettingsMessage = Extract<
  WebviewMessage,
  | { type: 'setDefaultModel' }
  | { type: 'setMaxToolIterations' }
  | { type: 'setReasoningEffort' }
  | { type: 'setCodexServiceTier' }
  | { type: 'setEditorContextMode' }
  | { type: 'setStreamingEnabled' }
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
