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

export type Chat = {
  id: string;
  title: string;
  model: string;
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

export type AgentMode = {
  id: AgentModeId;
  label: string;
  instructions: string;
};

export type ToolPermissionItem = {
  name: string;
  description: string;
  permission: ToolPermissionMode;
  defaultPermission: ToolPermissionMode;
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
  agentLanguage: AgentLanguage;
  agentMode: AgentModeId;
  agentModes: AgentMode[];
  codexAuthenticated: boolean;
  toolPermissions: ToolPermissionItem[];
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
  | { type: 'setMaxToolIterations'; maxToolIterations: number }
  | { type: 'setReasoningEffort'; reasoningEffort: ReasoningEffort }
  | { type: 'setAgentLanguage'; language: AgentLanguage }
  | { type: 'setAgentMode'; modeId: AgentModeId }
  | { type: 'setAgentModeInstructions'; modeId: AgentModeId; instructions: string }
  | { type: 'addAgentMode'; label: string; instructions: string }
  | { type: 'deleteAgentMode'; modeId: string }
  | { type: 'codexLogin' }
  | { type: 'codexLogout' }
  | { type: 'resolveToolCall'; messageId: string; approved: boolean }
  | { type: 'stop' }
  | { type: 'clear' }
  | { type: 'copyMessage'; markdown: string };
