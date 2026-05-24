import type * as vscode from 'vscode';
import type { ChatUsageEstimate } from '../chats/types';
import type { OpenRouterMessage } from '../openrouter/types';
import type { ToolPermissionMode } from '../tools/permissions';
import type { AgentModeId } from './settings';

export type ReasoningEffort = 'auto' | 'low' | 'medium' | 'high';

export type AgentRun = {
  chatId: string;
  abortController: AbortController;
  stopRequested: boolean;
  permissionResolvers: Map<string, (approved: boolean) => void>;
};

export type AgentLoopResult = {
  answer: string;
  history: OpenRouterMessage[];
  usage: ChatUsageEstimate;
};

export type WebviewMessage =
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
  | { type: 'setAgentLanguage'; language: 'ru' | 'en' }
  | { type: 'setAgentMode'; modeId: AgentModeId }
  | { type: 'setAgentModeInstructions'; modeId: AgentModeId; instructions: string }
  | { type: 'addAgentMode'; label: string; instructions: string }
  | { type: 'deleteAgentMode'; modeId: string }
  | { type: 'codexLogin' }
  | { type: 'codexLogout' }
  | { type: 'resolveToolCall'; messageId: string; approved: boolean }
  | { type: 'openWorkspaceFile'; path: string; line?: number; column?: number }
  | { type: 'stop' }
  | { type: 'clear' }
  | { type: 'copyMessage'; markdown: string };

export type WebviewSurface = {
  id: string;
  kind: 'sidebar' | 'editor';
  webview: vscode.Webview;
  getChatId(): string;
  setChatId(chatId: string): void;
};
