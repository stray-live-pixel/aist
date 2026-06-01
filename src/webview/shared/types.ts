export type SubagentKind = 'memory.analysis';
export type SubagentRunStatus = 'created' | 'running' | 'success' | 'error' | 'stopped';
export type SubagentRunMode = 'single_model_call' | 'agent_loop';

/**
 * Что это: persisted запуск дочернего субагента для UI.
 * Зачем нужно: карточка в основном чате может открыть полную историю анализа без загрязнения основного контекста модели.
 */
export type SubagentRun = {
  id: string;
  parentChatId: string;
  kind: SubagentKind;
  mode: SubagentRunMode;
  title: string;
  status: SubagentRunStatus;
  model: string;
  messages: ChatMessage[];
  history: Array<Record<string, unknown>>;
  result?: unknown;
  error?: string;
  includeResultInParentModelContext: boolean;
  startedAt: number;
  finishedAt?: number;
  updatedAt: number;
};

export type ChatMessageSubagentRef = {
  runId: string;
  kind: SubagentKind;
  title: string;
};

export type ChatMessageRole = 'user' | 'assistant' | 'status' | 'tool' | 'error' | 'subagent';

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content?: string;
  name?: string;
  status?: 'waiting' | 'running' | 'done' | 'error' | 'denied';
  approval?: 'pending' | 'approved' | 'denied';
  reason?: string;
  nextStep?: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  modelResult?: Record<string, unknown>;
  userApprovalComment?: string;
  userComment?: string;
  usage?: ChatMessageUsageEstimate;
  marker?: string;
  subagent?: ChatMessageSubagentRef;
  subagentRunId?: string;
  subagentKind?: SubagentKind;
  createdAt: number;
};

export type ChatMessageUsageEstimate = {
  tokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
};

export type ChatVcsState = {
  command: string;
  branch: string;
  baseBranch?: string;
  isolated: boolean;
};

export type ChatModelSettings = {
  model: string;
  reasoningEffort: ReasoningEffort;
  codexServiceTier: CodexServiceTier;
  maxToolIterations: number;
  editorContextMode: EditorContextMode;
  streamingEnabled: boolean;
};

export type ChatSummary = {
  id: string;
  title: string;
  model: string;
  modelSettings: ChatModelSettings;
  previousChatId?: string;
  compactedAt?: number;
  compactionModel?: string;
  vcs?: ChatVcsState;
  messageCount: number;
  lastUserMessage: string;
  busy: boolean;
  activity?: 'thinking' | 'waitingForApproval' | 'runningTool' | 'answering' | 'stopping';
  activityDetail?: string;
  lastMessageAt: number;
  updatedAt: number;
};

export type ChatUsageEstimate = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
};

export type ChatContextEstimate = {
  tokens?: number;
  maxTokens?: number;
  percent?: number;
  inputCostUsd?: number;
};

export type ChatPlanItemStatus = 'pending' | 'in_progress' | 'done' | 'blocked';

export type ChatPlanItem = {
  id: string;
  text: string;
  status: ChatPlanItemStatus;
};

export type ChatPlan = {
  title: string;
  items: ChatPlanItem[];
};

export type ChatModelRequestPhase =
  | 'sending'
  | 'receiving'
  | 'streaming'
  | 'completed'
  | 'retrying'
  | 'failed'
  | 'aborted';

export type ChatModelRequestStatus = {
  provider?: 'openrouter' | 'codex';
  model: string;
  attempt: number;
  maxAttempts: number;
  requestNumber: number;
  phase: ChatModelRequestPhase;
  stream: boolean;
  startedAt: number;
  updatedAt: number;
  durationMs?: number;
  endpoint?: string;
  method?: string;
  httpStatus?: number;
  httpStatusText?: string;
  retryable?: boolean;
  error?: string;
  responseBody?: string;
};

export type CompactPreviousChat = Omit<Chat, 'previousChat'>;

export type Chat = {
  id: string;
  title: string;
  model: string;
  modelSettings: ChatModelSettings;
  previousChatId?: string;
  compactedAt?: number;
  compactionModel?: string;
  vcs?: ChatVcsState;
  previousChat?: CompactPreviousChat;
  messages: ChatMessage[];
  lastAnswer: string;
  activity?: 'thinking' | 'waitingForApproval' | 'runningTool' | 'answering' | 'stopping';
  activityDetail?: string;
  modelRequest?: ChatModelRequestStatus;
  busy: boolean;
  context?: ChatContextEstimate;
  contextLength?: number;
  activePlan?: ChatPlan;
  reflectionCandidates?: AgentReflectionCandidate[];
  usage: ChatUsageEstimate;
  createdAt: number;
  updatedAt: number;
};

export type ProviderProfile = {
  id: string;
  name: string;
  provider: ModelProvider;
  endpoint: string;
  proxyHost: string;
  builtIn: boolean;
  apiKeyConfigured: boolean;
  apiKeySource: 'profile-secret' | 'legacy-global-secret' | 'unsupported' | 'none';
};

export type ProviderProfileInput = Partial<
  Pick<ProviderProfile, 'id' | 'name' | 'provider' | 'endpoint' | 'proxyHost'>
>;

export type ModelProvider = 'openrouter' | 'codex';

export type ModelOption = {
  id: string;
  name: string;
  provider?: 'openrouter' | 'codex';
  contextLength?: number;
  pricing?: {
    prompt?: number;
    completion?: number;
  };
  supportsTools: boolean;
  /** Какие ускоренные service_tier доступны для ChatGPT Codex; отсутствие поля скрывает control в UI. */
  codexServiceTiers?: Exclude<CodexServiceTier, 'auto'>[];
};

export type ToolPermissionMode = 'ask' | 'auto';
export type ReasoningEffort = 'auto' | 'low' | 'medium' | 'high';
export type CodexServiceTier = 'auto' | 'priority';
export type EditorContextMode = 'auto' | 'selection' | 'file' | 'off';
export type AgentLanguage = 'ru' | 'en';
export type AuxiliaryModelId = 'compaction' | 'tool' | 'memory';
export type AuxiliaryModelSettings = {
  model: string;
  reasoningEffort: ReasoningEffort;
  allowTools: boolean;
};
export type AuxiliaryToolModelOverride = AuxiliaryModelSettings & {
  toolName: string;
};
export type AuxiliaryToolModelSettings = AuxiliaryModelSettings & {
  overrides: AuxiliaryToolModelOverride[];
};
export type AuxiliaryModelsSettings = {
  compaction: AuxiliaryModelSettings;
  tool: AuxiliaryToolModelSettings;
  memory: AuxiliaryModelSettings;
};
export type AgentModeId = string;
export type ToolPermissionPresetId = string;

export type AgentMode = {
  id: AgentModeId;
  label: string;
  instructions: string;
};

export type AgentSkill = {
  id: string;
  label: string;
  description: string;
  command: string;
  permission: ToolPermissionMode;
  scope: AgentItemScope;
};

export type AgentConfigScope = 'workspace' | 'user';
export type AgentItemScope = 'global' | 'local';
export type AgentInstructionKind = 'instruction' | 'mode';
export type AgentMemoryScope = 'global' | 'project';

export type AgentItemRef = {
  scope: AgentItemScope;
  id: string;
};

export type AgentInstructionItem = {
  id: string;
  label: string;
  content: string;
  scope: AgentItemScope;
  kind: 'instruction';
};

export type AgentModeItem = {
  id: string;
  label: string;
  instructions: string;
  scope: AgentItemScope;
  kind: 'mode';
};

export type AgentPromptPreset = {
  id: string;
  label: string;
  instructionRefs: AgentItemRef[];
  modeRef?: AgentItemRef;
  scope: AgentItemScope;
};

export type AgentPromptConfig = {
  globalInstructions: AgentInstructionItem[];
  localInstructions: AgentInstructionItem[];
  globalModes: AgentModeItem[];
  localModes: AgentModeItem[];
  presets: AgentPromptPreset[];
  activeInstructionRefs: AgentItemRef[];
  activeModeRef?: AgentItemRef;
  activePresetId?: string;
};

export type AgentInstructionSource = {
  id: string;
  title: string;
  content: string;
  priority: number;
  kind: 'base' | 'file' | 'declarative' | 'mode' | 'custom' | 'skills';
  source?: string;
};

export type AgentMemoryItem = {
  id: string;
  scope: AgentMemoryScope;
  note: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type AgentReflectionCandidateKind =
  | 'memory_preference'
  | 'project_lesson'
  | 'verification_command'
  | 'declarative_definition';

export type AgentReflectionCandidateStatus = 'pending' | 'saved' | 'rejected';

export type AgentReflectionCandidate = {
  id: string;
  kind: AgentReflectionCandidateKind;
  title: string;
  content: string;
  reason?: string;
  scope?: 'global' | 'project' | 'local';
  status: AgentReflectionCandidateStatus;
  createdAt: number;
  sourceSubagentRunId?: string;
};

export type ToolPermissionItem = {
  name: string;
  label?: string;
  description: string;
  permission: ToolPermissionMode;
  defaultPermission: ToolPermissionMode;
  source?: 'builtin' | 'skill' | 'project';
  enabled?: boolean;
  version?: string;
};

export type ProjectToolDiagnostic = {
  code: string;
  message: string;
  path?: string;
  toolId?: string;
};

export type ToolPermissionPreset = {
  id: ToolPermissionPresetId;
  label: string;
  description: string;
  permissions: Record<string, ToolPermissionMode>;
};

export type CompactionSettings = {
  enabled: boolean;
  thresholdPercent: number;
  keepLastMessages: number;
  model: string;
  reasoningEffort: ReasoningEffort;
  allowTools: boolean;
};

export type ApprovalNotificationSettings = {
  enabled: boolean;
  systemNotifications: boolean;
  sound: boolean;
  volume: number;
  durationSeconds: number;
};

export type ComposerUiSettings = {
  gradientWhileBusy: boolean;
  minimizeOnBlur: boolean;
};

export type RunTelemetryStatus = 'success' | 'error' | 'stopped';

export type RunTelemetryApprovals = {
  requested: number;
  approved: number;
  denied: number;
};

export type AgentRunTelemetryRecord = {
  schemaVersion: number;
  runId: string;
  chatId: string;
  model: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  status: RunTelemetryStatus;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  modelRequestCount: number;
  toolCallCount: number;
  toolCallsByType: Record<string, number>;
  repeatedToolCalls: number;
  firstEditLatencyMs?: number;
  failedEdits: number;
  approvals: RunTelemetryApprovals;
  contextBytes: number;
};

export type AgentTelemetryAggregates = {
  runCount: number;
  successCount: number;
  errorCount: number;
  stoppedCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  toolCallCount: number;
  repeatedToolCalls: number;
  failedEdits: number;
  approvals: RunTelemetryApprovals;
  contextBytes: number;
  averageDurationMs: number;
  averageFirstEditLatencyMs?: number;
  toolCallsByType: Record<string, number>;
};

export type AgentTelemetryDashboard = {
  storagePath?: string;
  recentRuns: AgentRunTelemetryRecord[];
  aggregates: AgentTelemetryAggregates;
  jsonExport: string;
  markdownExport: string;
};

export type AutonomousSourceKind = 'native' | 'legacy';
export type AutonomousEngineId = 'claude-cli' | 'codex-cli' | 'openrouter-api' | 'codex-api' | 'dry-run';
export type AutonomousSessionStatus = 'created' | 'running' | 'paused' | 'finished' | 'stopped' | 'error';

export type AutonomousDefinitionDiagnostic = {
  code: string;
  message: string;
  path?: string;
};

export type AutonomousStageDefinition = {
  index: number;
  file: string;
  title: string;
  body: string;
  model?: string;
  codexModel?: string;
  contexts: { mode: 'continue' | 'continue-from' | 'summary-from'; from?: number; summaryRules?: string }[];
  summaryRules?: string;
  sourcePath: string;
};

export type AutonomousFlowDefinition = {
  id: string;
  title: string;
  description: string;
  body: string;
  defaultModel?: string;
  defaultCodexModel?: string;
  defaultSummaryRules?: string;
  stages: AutonomousStageDefinition[];
  sourceKind: AutonomousSourceKind;
  sourcePath: string;
  diagnostics: AutonomousDefinitionDiagnostic[];
};

export type AutonomousRunTaskDefinition = {
  index: number;
  taskPath: string;
  flowId: string;
  repeat: number;
  body: string;
  sourcePath: string;
};

export type AutonomousRunDefinition = {
  id: string;
  title: string;
  workDir: string;
  repeat: number;
  tasks: AutonomousRunTaskDefinition[];
  sourceKind: AutonomousSourceKind;
  sourcePath: string;
  diagnostics: AutonomousDefinitionDiagnostic[];
};

export type AutonomousEvent = {
  id: string;
  ts: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  action: string;
  message: string;
  stageIndex?: number;
  taskIndex?: number;
  data?: Record<string, unknown>;
};

export type AutonomousSessionView = {
  meta: {
    id: string;
    kind: 'flow' | 'run' | 'direct';
    targetId?: string;
    status: AutonomousSessionStatus;
    engineId: AutonomousEngineId;
    workspaceRoot: string;
    workDir: string;
    startedAt: string;
    finishedAt?: string;
    error?: string;
  };
  events: AutonomousEvent[];
};

export type CreateAutonomousFlowInput = {
  id: string;
  title?: string;
};

export type EditableAutonomousStageDefinition = {
  file: string;
  title: string;
  body: string;
  model?: string;
  codexModel?: string;
  contexts: { mode: 'continue' | 'continue-from' | 'summary-from'; from?: number; summaryRules?: string }[];
  summaryRules?: string;
};

export type EditableAutonomousFlowDefinition = {
  id: string;
  title: string;
  description: string;
  body: string;
  defaultModel?: string;
  defaultCodexModel?: string;
  defaultSummaryRules?: string;
  stages: EditableAutonomousStageDefinition[];
};

export type AutonomousState = {
  workspaceName: string;
  storageRoot: string;
  definitions: {
    flows: AutonomousFlowDefinition[];
    runs: AutonomousRunDefinition[];
    diagnostics: AutonomousDefinitionDiagnostic[];
  };
  engines: {
    id: AutonomousEngineId;
    label: string;
    capabilities: { resume: boolean; fork: boolean; tools: boolean; requiresBinary?: string; requiresAuth?: boolean };
  }[];
  sessions: AutonomousSessionView[];
  diagnostics: AutonomousDefinitionDiagnostic[];
};

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
  auxiliaryModels: AuxiliaryModelsSettings;
  compactionSettings: CompactionSettings;
  approvalNotificationSettings: ApprovalNotificationSettings;
  composerUiSettings: ComposerUiSettings;
  telemetry: AgentTelemetryDashboard;
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
  | { type: 'showChats' }
  | { type: 'errorModal'; message: string }
  | { type: 'autonomous.state'; state: AutonomousState }
  | { type: 'autonomous.error'; message: string };

export type WebviewToExtensionMessage =
  | { type: 'webviewReady' }
  | { type: 'ask'; prompt: string; continueWithoutUserPrompt?: boolean }
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
  | { type: 'autonomous.exportSession'; sessionId: string; format: 'markdown' | 'json' };
