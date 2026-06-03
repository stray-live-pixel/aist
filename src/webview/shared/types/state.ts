import type {
  AgentConfigScope,
  AgentInstructionSource,
  AgentMemoryItem,
  AgentMode,
  AgentModeId,
  AgentPromptConfig,
  AgentSkill,
  ApprovalNotificationSettings,
  CompactionSettings,
  ComposerUiSettings,
  ProjectToolDiagnostic,
  ToolPermissionItem,
  ToolPermissionPreset,
  ToolPermissionPresetId
} from './agentConfig';
import type { Chat, ChatModelSettings, ChatSummary } from './chat';
import type {
  AgentLanguage,
  AuxiliaryModelsSettings,
  CodexServiceTier,
  EditorContextMode,
  ModelOption,
  ProviderProfile,
  ReasoningEffort
} from './model';
import type { SubagentRun } from './subagent';
import type { AgentTelemetryDashboard, PerformanceTelemetryDashboard } from './telemetry';

export type AgentState = {
  viewKind: 'sidebar' | 'editor';
  /** Версия установленного VS Code extension; приходит из packageJSON, чтобы UI не хардкодил номер релиза. */
  extensionVersion: string;
  workspaceName: string;
  tools: string[];
  chats: ChatSummary[];
  activeChat: Chat;
  models: ModelOption[];
  providerProfiles: ProviderProfile[];
  defaultModelSettings: ChatModelSettings;
  maxToolIterations: number;
  reasoningEffort: ReasoningEffort;
  /** Управляет ChatGPT Codex service_tier; auto не отправляет поле, priority просит ускоренную обработку. */
  codexServiceTier: CodexServiceTier;
  editorContextMode: EditorContextMode;
  /** Включает live streaming ответа; по умолчанию false, потому что non-streaming устойчивее к обрывам SSE. */
  streamingEnabled: boolean;
  /** Когда false, модель может не заполнять reason/nextStep у tool-call и экономит токены. */
  toolCallNotesRequired: boolean;
  /** Команда git-like VCS для Composer-кнопок веток; например git или arc. */
  vcsCommand: string;
  auxiliaryModels: AuxiliaryModelsSettings;
  compactionSettings: CompactionSettings;
  approvalNotificationSettings: ApprovalNotificationSettings;
  composerUiSettings: ComposerUiSettings;
  telemetry: AgentTelemetryDashboard;
  performanceTelemetry: PerformanceTelemetryDashboard;
  agentLanguage: AgentLanguage;
  agentMode: AgentModeId;
  agentModes: AgentMode[];
  agentConfigScope: AgentConfigScope;
  projectInstructions: string;
  promptConfig: AgentPromptConfig;
  memoryItems: AgentMemoryItem[];
  subagentRuns: SubagentRun[];
  instructionSources: AgentInstructionSource[];
  customSkills: AgentSkill[];
  codexAuthenticated: boolean;
  toolPermissions: ToolPermissionItem[];
  toolPermissionPresets: ToolPermissionPreset[];
  activeToolPermissionPresetId: ToolPermissionPresetId | 'custom';
  projectToolDiagnostics: ProjectToolDiagnostic[];
};
