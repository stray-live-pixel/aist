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
import { SettingsMessage } from './SettingsMessage';

export function isSettingsMessage(message: WebviewMessage): message is SettingsMessage {
  return [
    'setDefaultModel',
    'setMaxToolIterations',
    'setReasoningEffort',
    'setCodexServiceTier',
    'setEditorContextMode',
    'setStreamingEnabled',
    'upsertProviderProfile',
    'setProviderProfileApiKey',
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
