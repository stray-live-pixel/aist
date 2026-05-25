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
  busy: boolean;
  context?: ChatContextEstimate;
  contextLength?: number;
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
};

export type ToolPermissionMode = 'ask' | 'auto';
export type ReasoningEffort = 'auto' | 'low' | 'medium' | 'high';
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

export type AgentState = {
  viewKind: 'sidebar' | 'editor';
  workspaceName: string;
  tools: string[];
  chats: ChatSummary[];
  activeChat: Chat;
  models: ModelOption[];
  maxToolIterations: number;
  reasoningEffort: ReasoningEffort;
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
  | { type: 'page'; page: 'chat' | 'settings' }
  | { type: 'errorModal'; message: string };

export type WebviewToExtensionMessage =
  | { type: 'webviewReady' }
  | { type: 'ask'; prompt: string }
  | { type: 'newChat' }
  | { type: 'duplicateChat'; chatId: string }
  | { type: 'deleteChat'; chatId: string }
  | { type: 'setActiveChat'; chatId: string }
  | { type: 'openChatInEditor'; chatId?: string }
  | { type: 'setModel'; model: string }
  | { type: 'setToolPermission'; toolName: string; permission: ToolPermissionMode }
  | { type: 'setToolPermissionPreset'; presetId: ToolPermissionPresetId }
  | { type: 'setMaxToolIterations'; maxToolIterations: number }
  | { type: 'setReasoningEffort'; reasoningEffort: ReasoningEffort }
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
  | { type: 'addSkill'; label: string; description: string; command: string; permission: ToolPermissionMode }
  | {
      type: 'updateSkill';
      skillId: string;
      label: string;
      description: string;
      command: string;
      permission: ToolPermissionMode;
    }
  | { type: 'deleteSkill'; skillId: string }
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
  | { type: 'copyMessage'; markdown: string };
