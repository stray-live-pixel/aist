export type ChatMessageRole = 'user' | 'assistant' | 'status' | 'tool' | 'error';

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content?: string;
  name?: string;
  status?: 'waiting' | 'running' | 'done' | 'error' | 'denied';
  reason?: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  createdAt: number;
};

export type ChatSummary = {
  id: string;
  title: string;
  model: string;
  messageCount: number;
  busy: boolean;
  updatedAt: number;
};

export type Chat = {
  id: string;
  title: string;
  model: string;
  messages: ChatMessage[];
  lastAnswer: string;
  busy: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ModelOption = {
  id: string;
  name: string;
  contextLength?: number;
  supportsTools: boolean;
};

export type ToolPermissionMode = 'ask' | 'auto';

export type ToolPermissionItem = {
  name: string;
  description: string;
  permission: ToolPermissionMode;
  defaultPermission: ToolPermissionMode;
};

export type AgentState = {
  workspaceName: string;
  tools: string[];
  chats: ChatSummary[];
  activeChat: Chat;
  models: ModelOption[];
  toolPermissions: ToolPermissionItem[];
};

export type ExtensionToWebviewMessage = {
  type: 'state';
} & AgentState;

export type WebviewToExtensionMessage =
  | { type: 'webviewReady' }
  | { type: 'ask'; prompt: string }
  | { type: 'newChat' }
  | { type: 'setModel'; model: string }
  | { type: 'setToolPermission'; toolName: string; permission: ToolPermissionMode }
  | { type: 'clear' }
  | { type: 'copyMessage'; markdown: string }
  | { type: 'insertLastAnswer' };
