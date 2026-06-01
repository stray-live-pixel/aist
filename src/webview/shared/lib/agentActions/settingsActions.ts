import type {
  AgentLanguage,
  ApprovalNotificationSettings,
  AuxiliaryModelId,
  AuxiliaryModelSettings,
  AuxiliaryToolModelOverride,
  CodexServiceTier,
  CompactionSettings,
  ComposerUiSettings,
  EditorContextMode,
  ProviderProfileInput,
  ReasoningEffort,
  ToolPermissionMode,
  ToolPermissionPresetId
} from '../../types';
import { post } from './post';

/**
 * Что это: действия настроек модели, разрешений и UI composer.
 * Зачем нужно: настройки агента меняются через один typed facade без локального state.
 * Какую проблему решает: settings UI не зависит от низкоуровневого формата webview IPC.
 */
export const settingsActions = {
  setToolPermission(toolName: string, permission: ToolPermissionMode): void {
    post({ message: { type: 'setToolPermission', toolName, permission } });
  },
  setToolPermissionPreset(presetId: ToolPermissionPresetId): void {
    post({ message: { type: 'setToolPermissionPreset', presetId } });
  },
  setProjectToolEnabled(toolId: string, enabled: boolean): void {
    post({ message: { type: 'setProjectToolEnabled', toolId, enabled } });
  },
  setMaxToolIterations(maxToolIterations: number): void {
    post({ message: { type: 'setMaxToolIterations', maxToolIterations } });
  },
  setReasoningEffort(reasoningEffort: ReasoningEffort): void {
    post({ message: { type: 'setReasoningEffort', reasoningEffort } });
  },
  setCodexServiceTier(codexServiceTier: CodexServiceTier): void {
    post({ message: { type: 'setCodexServiceTier', codexServiceTier } });
  },
  setEditorContextMode(editorContextMode: EditorContextMode): void {
    post({ message: { type: 'setEditorContextMode', editorContextMode } });
  },
  setStreamingEnabled(streamingEnabled: boolean): void {
    post({ message: { type: 'setStreamingEnabled', streamingEnabled } });
  },
  upsertProviderProfile(profile: ProviderProfileInput): void {
    post({ message: { type: 'upsertProviderProfile', profile } });
  },
  setProviderProfileApiKey(profileId: string, apiKey: string): void {
    post({ message: { type: 'setProviderProfileApiKey', profileId, apiKey } });
  },
  duplicateProviderProfile(profileId: string): void {
    post({ message: { type: 'duplicateProviderProfile', profileId } });
  },
  deleteProviderProfile(profileId: string): void {
    post({ message: { type: 'deleteProviderProfile', profileId } });
  },
  setCompactionSettings(settings: Partial<CompactionSettings>): void {
    post({ message: { type: 'setCompactionSettings', settings } });
  },
  setAuxiliaryModelSettings(id: AuxiliaryModelId, settings: Partial<AuxiliaryModelSettings>): void {
    post({ message: { type: 'setAuxiliaryModelSettings', id, settings } });
  },
  setAuxiliaryToolModelOverrides(overrides: AuxiliaryToolModelOverride[]): void {
    post({ message: { type: 'setAuxiliaryToolModelOverrides', overrides } });
  },
  setApprovalNotificationSettings(settings: Partial<ApprovalNotificationSettings>): void {
    post({ message: { type: 'setApprovalNotificationSettings', settings } });
  },
  setComposerUiSettings(settings: Partial<ComposerUiSettings>): void {
    post({ message: { type: 'setComposerUiSettings', settings } });
  },
  setAgentLanguage(language: AgentLanguage): void {
    post({ message: { type: 'setAgentLanguage', language } });
  }
};
