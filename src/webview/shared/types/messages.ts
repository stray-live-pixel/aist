import type {
  AgentConfigScope,
  AgentInstructionKind,
  AgentItemRef,
  AgentItemScope,
  AgentMemoryScope,
  AgentModeId,
  ApprovalNotificationSettings,
  CompactionSettings,
  ComposerUiSettings,
  MemorySettings,
  ToolPermissionPresetId
} from './agentConfig';
import type { AgentAttachment } from './attachment';
import type {
  AutonomousEngineId,
  AutonomousState,
  CreateAutonomousFlowInput,
  EditableAutonomousFlowDefinition
} from './autonomous';
import type { Chat, ChatMessage, ChatModelSettings, ChatSummary } from './chat';
import type { IsolationSessionEvent } from './isolation';
import type {
  AgentLanguage,
  AuxiliaryModelId,
  AuxiliaryModelSettings,
  AuxiliaryToolModelOverride,
  CodexServiceTier,
  EditorContextMode,
  ProviderProfileInput,
  ReasoningEffort,
  ToolPermissionMode
} from './model';
import type { AgentState } from './state';

export type ChatPatchMessage = {
  type: 'chat.patch';
  /** Идентификатор чата, к которому относится подтверждённое backend-изменение. */
  chatId: string;
  /** Новое или обновлённое сообщение; отсутствует для чистых статусных изменений. */
  message?: ChatMessage;
  /** Небольшой patch активного чата, который нужен UI без пересылки полной истории. */
  chat?: Partial<
    Pick<
      Chat,
      | 'busy'
      | 'activity'
      | 'activityDetail'
      | 'modelRequest'
      | 'lastAnswer'
      | 'usage'
      | 'context'
      | 'contextLength'
      | 'activePlan'
      | 'reflectionCandidates'
      | 'updatedAt'
    >
  >;
  /** Summary нужен списку чатов, чтобы title/count/busy оставались консистентными с backend. */
  summary?: ChatSummary;
  /** Причина полезна для диагностики транспорта и безопасного fallback на full snapshot. */
  reason?: string;
};

export type ExtensionToWebviewMessage =
  | ({
      type: 'state';
    } & AgentState)
  | ChatPatchMessage
  | { type: 'page'; page: 'chat' | 'settings' | 'autonomous' }
  | { type: 'loading'; message: string }
  | { type: 'showChats' }
  | { type: 'showIsolation' }
  | { type: 'errorModal'; message: string }
  | { type: 'autonomous.state'; state: AutonomousState }
  | { type: 'autonomous.error'; message: string }
  | { type: 'isolation.events'; sessionId: string; events: IsolationSessionEvent[] };

export type WebviewRenderPerformanceMetric = {
  type: 'performance.renderMetric';
  component: string;
  chatId?: string;
  messageCount?: number;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  renderCount: number;
  maxRenderDurationMs: number;
};

export type WebviewToExtensionMessage =
  | { type: 'webviewReady' }
  | WebviewRenderPerformanceMetric
  | { type: 'ask'; prompt: string; continueWithoutUserPrompt?: boolean; attachments?: AgentAttachment[] }
  | { type: 'newChat' }
  | { type: 'duplicateChat'; chatId: string }
  | { type: 'deleteChat'; chatId: string }
  | { type: 'setActiveChat'; chatId: string }
  | { type: 'openChatInEditor'; chatId?: string }
  | { type: 'openChatJson'; chatId?: string }
  | { type: 'setModel'; model: string }
  | { type: 'setDefaultModel'; model: string }
  | { type: 'setChatModelSettings'; settings: Partial<ChatModelSettings> }
  | { type: 'resetChatModelSettings' }
  | { type: 'refreshModelsForProvider'; provider: 'openrouter' | 'codex' }
  | { type: 'setToolPermission'; toolName: string; permission: ToolPermissionMode }
  | { type: 'setToolPermissionPreset'; presetId: ToolPermissionPresetId }
  | { type: 'setProjectToolEnabled'; toolId: string; enabled: boolean }
  | { type: 'setMaxToolIterations'; maxToolIterations: number }
  | { type: 'setReasoningEffort'; reasoningEffort: ReasoningEffort }
  | { type: 'setCodexServiceTier'; codexServiceTier: CodexServiceTier }
  | { type: 'setEditorContextMode'; editorContextMode: EditorContextMode }
  | { type: 'setStreamingEnabled'; streamingEnabled: boolean }
  | { type: 'setToolCallNotesRequired'; required: boolean }
  | { type: 'setVcsCommand'; command: string }
  | { type: 'upsertProviderProfile'; profile: ProviderProfileInput }
  | { type: 'setProviderProfileApiKey'; profileId: string; apiKey: string }
  | { type: 'duplicateProviderProfile'; profileId: string }
  | { type: 'deleteProviderProfile'; profileId: string }
  | { type: 'compactChat'; chatId?: string }
  | { type: 'setCompactionSettings'; settings: Partial<CompactionSettings> }
  | { type: 'setAuxiliaryModelSettings'; id: AuxiliaryModelId; settings: Partial<AuxiliaryModelSettings> }
  | { type: 'setAuxiliaryToolModelOverrides'; overrides: AuxiliaryToolModelOverride[] }
  | { type: 'setApprovalNotificationSettings'; settings: Partial<ApprovalNotificationSettings> }
  | { type: 'setComposerUiSettings'; settings: Partial<ComposerUiSettings> }
  | { type: 'setMemorySettings'; settings: Partial<MemorySettings> }
  | { type: 'setAgentLanguage'; language: AgentLanguage }
  | { type: 'setAgentMode'; modeId: AgentModeId }
  | { type: 'setAgentModeInstructions'; modeId: AgentModeId; instructions: string }
  | { type: 'setAgentConfigScope'; scope: AgentConfigScope }
  | { type: 'setProjectInstructions'; instructions: string }
  | { type: 'addAgentMode'; label: string; instructions: string }
  | { type: 'deleteAgentMode'; modeId: string }
  | {
      type: 'upsertPromptItem';
      scope: AgentItemScope;
      kind: AgentInstructionKind;
      id?: string;
      label: string;
      content: string;
    }
  | { type: 'duplicatePromptItem'; scope: AgentItemScope; kind: AgentInstructionKind; id: string }
  | { type: 'deletePromptItem'; scope: AgentItemScope; kind: AgentInstructionKind; id: string }
  | { type: 'setActivePromptConfig'; instructionRefs: AgentItemRef[]; modeRef?: AgentItemRef; presetId?: string }
  | { type: 'applyPromptPreset'; presetId: string }
  | {
      type: 'upsertPromptPreset';
      id?: string;
      label: string;
      instructionRefs: AgentItemRef[];
      modeRef?: AgentItemRef;
      scope?: AgentItemScope;
    }
  | { type: 'deletePromptPreset'; presetId: string }
  | { type: 'setMemoryEnabled'; scope: AgentMemoryScope; id: string; enabled: boolean }
  | { type: 'deleteMemory'; scope: AgentMemoryScope; id: string }
  | { type: 'saveReflectionCandidate'; chatId: string; candidateId: string }
  | { type: 'rejectReflectionCandidate'; chatId: string; candidateId: string }
  | { type: 'runMemoryAnalysis'; chatId: string }
  | {
      type: 'addSkill';
      scope?: AgentItemScope;
      label: string;
      description: string;
      command: string;
      permission: ToolPermissionMode;
    }
  | {
      type: 'updateSkill';
      scope?: AgentItemScope;
      skillId: string;
      label: string;
      description: string;
      command: string;
      permission: ToolPermissionMode;
    }
  | { type: 'deleteSkill'; scope?: AgentItemScope; skillId: string }
  | { type: 'codexLogin' }
  | { type: 'codexLogout' }
  | {
      type: 'resolveToolCall';
      messageId: string;
      decision: 'approve' | 'deny-stop' | 'deny-continue';
      comment?: string;
      rememberGlobal?: string;
      rememberProject?: string;
    }
  | { type: 'openWorkspaceFile'; path: string; line?: number; column?: number; endLine?: number; endColumn?: number }
  | { type: 'stop'; chatId?: string }
  | { type: 'clear' }
  | { type: 'copyMessage'; markdown: string }
  | { type: 'vcs.refresh' }
  | { type: 'vcs.isolateChat' }
  | { type: 'vcs.commitAndForcePush' }
  | { type: 'vcs.mergeToMain' }
  | { type: 'autonomous.refresh' }
  | { type: 'autonomous.importLegacy' }
  | { type: 'autonomous.createFlow'; flow: CreateAutonomousFlowInput }
  | { type: 'autonomous.deleteFlow'; flowId: string }
  | { type: 'autonomous.saveFlow'; flow: EditableAutonomousFlowDefinition }
  | {
      type: 'autonomous.startFlow';
      flowId: string;
      launch: { engineId: AutonomousEngineId; dryRun: boolean; workDir?: string; extraPrompt?: string };
    }
  | {
      type: 'autonomous.startRun';
      runId: string;
      launch: { engineId: AutonomousEngineId; dryRun: boolean; workDir?: string; extraPrompt?: string };
    }
  | { type: 'autonomous.stopSession'; sessionId: string }
  | { type: 'autonomous.revealSession'; sessionId: string }
  | { type: 'autonomous.exportSession'; sessionId: string; format: 'markdown' | 'json' }
  | { type: 'isolation.start'; prompt: string }
  | { type: 'isolation.continue'; sessionId: string; prompt: string }
  | { type: 'isolation.stop'; sessionId: string }
  | { type: 'isolation.destroy'; sessionId: string }
  | { type: 'isolation.openWorktree'; sessionId: string }
  | { type: 'isolation.openPr'; sessionId: string }
  | { type: 'isolation.openChat'; sessionId: string }
  | { type: 'isolation.loadEvents'; sessionId: string }
  | { type: 'isolation.refresh' };
