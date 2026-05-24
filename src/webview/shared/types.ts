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
  usage?: ChatMessageUsageEstimate;
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
  tokens: number;
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
  activity?: 'thinking' | 'waitingForApproval' | 'runningTool' | 'stopping';
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
  agentLanguage: AgentLanguage;
  agentMode: AgentModeId;
  agentModes: AgentMode[];
  agentConfigScope: AgentConfigScope;
  projectInstructions: string;
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
  | { type: 'page'; page: 'chat' | 'settings' };

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
  | { type: 'setAgentLanguage'; language: AgentLanguage }
  | { type: 'setAgentMode'; modeId: AgentModeId }
  | { type: 'setAgentModeInstructions'; modeId: AgentModeId; instructions: string }
  | { type: 'setAgentConfigScope'; scope: AgentConfigScope }
  | { type: 'setProjectInstructions'; instructions: string }
  | { type: 'addAgentMode'; label: string; instructions: string }
  | { type: 'deleteAgentMode'; modeId: string }
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
  | { type: 'resolveToolCall'; messageId: string; approved: boolean }
  | { type: 'openWorkspaceFile'; path: string; line?: number; column?: number }
  | { type: 'stop' }
  | { type: 'clear' }
  | { type: 'copyMessage'; markdown: string };
