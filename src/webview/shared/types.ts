export type ChatMessageRole = 'user' | 'assistant' | 'status' | 'tool' | 'error';

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content?: string;
  name?: string;
  status?: 'waiting' | 'running' | 'done' | 'error' | 'denied';
  approval?: 'pending' | 'approved' | 'denied';
  reason?: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  userApprovalComment?: string;
  userComment?: string;
  usage?: ChatMessageUsageEstimate;
  marker?: string;
  createdAt: number;
};

export type ChatMessageUsageEstimate = {
  tokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
};

export type ChatSummary = {
  id: string;
  title: string;
  model: string;
  previousChatId?: string;
  compactedAt?: number;
  messageCount: number;
  lastUserMessage: string;
  busy: boolean;
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
  previousChatId?: string;
  compactedAt?: number;
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
  usage: ChatUsageEstimate;
  createdAt: number;
  updatedAt: number;
};

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
  kind: 'base' | 'file' | 'mode' | 'custom' | 'skills';
};

export type ToolPermissionItem = {
  name: string;
  description: string;
  permission: ToolPermissionMode;
  defaultPermission: ToolPermissionMode;
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
};

export type ApprovalNotificationSettings = {
  enabled: boolean;
  systemNotifications: boolean;
  sound: boolean;
  volume: number;
  durationSeconds: number;
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
  maxToolIterations: number;
  reasoningEffort: ReasoningEffort;
  /** Управляет ChatGPT Codex service_tier; auto не отправляет поле, priority просит ускоренную обработку. */
  codexServiceTier: CodexServiceTier;
  editorContextMode: EditorContextMode;
  /** Включает live streaming ответа; по умолчанию false, потому что non-streaming устойчивее к обрывам SSE. */
  streamingEnabled: boolean;
  compactionSettings: CompactionSettings;
  approvalNotificationSettings: ApprovalNotificationSettings;
  agentLanguage: AgentLanguage;
  agentMode: AgentModeId;
  agentModes: AgentMode[];
  agentConfigScope: AgentConfigScope;
  projectInstructions: string;
  promptConfig: AgentPromptConfig;
  instructionSources: AgentInstructionSource[];
  customSkills: AgentSkill[];
  codexAuthenticated: boolean;
  toolPermissions: ToolPermissionItem[];
  toolPermissionPresets: ToolPermissionPreset[];
  activeToolPermissionPresetId: ToolPermissionPresetId | 'custom';
};

export type ExtensionToWebviewMessage =
  | ({
      type: 'state';
    } & AgentState)
  | { type: 'page'; page: 'chat' | 'settings' | 'autonomous' }
  | { type: 'showChats' }
  | { type: 'errorModal'; message: string }
  | { type: 'autonomous.state'; state: AutonomousState }
  | { type: 'autonomous.error'; message: string };

export type WebviewToExtensionMessage =
  | { type: 'webviewReady' }
  | { type: 'ask'; prompt: string }
  | { type: 'newChat' }
  | { type: 'duplicateChat'; chatId: string }
  | { type: 'deleteChat'; chatId: string }
  | { type: 'setActiveChat'; chatId: string }
  | { type: 'openChatInEditor'; chatId?: string }
  | { type: 'openChatJson'; chatId?: string }
  | { type: 'setModel'; model: string }
  | { type: 'setToolPermission'; toolName: string; permission: ToolPermissionMode }
  | { type: 'setToolPermissionPreset'; presetId: ToolPermissionPresetId }
  | { type: 'setMaxToolIterations'; maxToolIterations: number }
  | { type: 'setReasoningEffort'; reasoningEffort: ReasoningEffort }
  | { type: 'setCodexServiceTier'; codexServiceTier: CodexServiceTier }
  | { type: 'setEditorContextMode'; editorContextMode: EditorContextMode }
  | { type: 'setStreamingEnabled'; streamingEnabled: boolean }
  | { type: 'compactChat'; chatId?: string }
  | { type: 'setCompactionSettings'; settings: Partial<CompactionSettings> }
  | { type: 'setApprovalNotificationSettings'; settings: Partial<ApprovalNotificationSettings> }
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
    }
  | { type: 'openWorkspaceFile'; path: string; line?: number; column?: number; endLine?: number; endColumn?: number }
  | { type: 'stop' }
  | { type: 'clear' }
  | { type: 'copyMessage'; markdown: string }
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
