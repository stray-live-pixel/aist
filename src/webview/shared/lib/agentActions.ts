import type {
  AgentInstructionKind,
  AgentItemRef,
  AgentItemScope,
  AgentLanguage,
  AgentModeId,
  ApprovalNotificationSettings,
  CodexServiceTier,
  CompactionSettings,
  ReasoningEffort,
  ToolPermissionMode,
  ToolPermissionPresetId,
  WebviewToExtensionMessage
} from '../types';
import { vscode } from './vscode';

/**
 * Что это: единая точка отправки команд из webview в extension.
 * Зачем нужно: React-компоненты остаются UI-слоем и не собирают IPC-сообщения вручную; при изменении контракта
 * проще обновить один модуль, а не искать vscode.postMessage по всему дереву компонентов.
 */
function post(message: WebviewToExtensionMessage): void {
  vscode.postMessage(message);
}

/**
 * Что это: command facade поверх событийного IPC webview -> extension.
 * Зачем нужно: в проекте source of truth живёт в extension, поэтому это не state-менеджер, а тонкий слой действий
 * без локального кеша, optimistic updates и скрытой бизнес-логики.
 */
export const agentActions = {
  webviewReady(): void {
    post({ type: 'webviewReady' });
  },

  ask(prompt: string): void {
    post({ type: 'ask', prompt });
  },

  stop(): void {
    post({ type: 'stop' });
  },

  clear(): void {
    post({ type: 'clear' });
  },

  newChat(): void {
    post({ type: 'newChat' });
  },

  duplicateChat(chatId: string): void {
    post({ type: 'duplicateChat', chatId });
  },

  deleteChat(chatId: string): void {
    post({ type: 'deleteChat', chatId });
  },

  setActiveChat(chatId: string): void {
    post({ type: 'setActiveChat', chatId });
  },

  openChatInEditor(chatId?: string): void {
    post({ type: 'openChatInEditor', chatId });
  },

  openChatJson(chatId?: string): void {
    post({ type: 'openChatJson', chatId });
  },

  setModel(model: string): void {
    post({ type: 'setModel', model });
  },

  setToolPermission(toolName: string, permission: ToolPermissionMode): void {
    post({ type: 'setToolPermission', toolName, permission });
  },

  setToolPermissionPreset(presetId: ToolPermissionPresetId): void {
    post({ type: 'setToolPermissionPreset', presetId });
  },

  setMaxToolIterations(maxToolIterations: number): void {
    post({ type: 'setMaxToolIterations', maxToolIterations });
  },

  setReasoningEffort(reasoningEffort: ReasoningEffort): void {
    post({ type: 'setReasoningEffort', reasoningEffort });
  },

  setCodexServiceTier(codexServiceTier: CodexServiceTier): void {
    post({ type: 'setCodexServiceTier', codexServiceTier });
  },

  setStreamingEnabled(streamingEnabled: boolean): void {
    post({ type: 'setStreamingEnabled', streamingEnabled });
  },

  compactChat(chatId?: string): void {
    post({ type: 'compactChat', chatId });
  },

  setCompactionSettings(settings: Partial<CompactionSettings>): void {
    post({ type: 'setCompactionSettings', settings });
  },

  setApprovalNotificationSettings(settings: Partial<ApprovalNotificationSettings>): void {
    post({ type: 'setApprovalNotificationSettings', settings });
  },

  setAgentLanguage(language: AgentLanguage): void {
    post({ type: 'setAgentLanguage', language });
  },

  setAgentMode(modeId: AgentModeId): void {
    post({ type: 'setAgentMode', modeId });
  },

  setAgentModeInstructions(modeId: AgentModeId, instructions: string): void {
    post({ type: 'setAgentModeInstructions', modeId, instructions });
  },

  setAgentConfigScope(scope: 'workspace' | 'user'): void {
    post({ type: 'setAgentConfigScope', scope });
  },

  setProjectInstructions(instructions: string): void {
    post({ type: 'setProjectInstructions', instructions });
  },

  addAgentMode(label: string, instructions: string): void {
    post({ type: 'addAgentMode', label, instructions });
  },

  deleteAgentMode(modeId: string): void {
    post({ type: 'deleteAgentMode', modeId });
  },

  upsertPromptItem(payload: {
    scope: AgentItemScope;
    kind: AgentInstructionKind;
    id?: string;
    label: string;
    content: string;
  }): void {
    post({ type: 'upsertPromptItem', ...payload });
  },

  duplicatePromptItem(scope: AgentItemScope, kind: AgentInstructionKind, id: string): void {
    post({ type: 'duplicatePromptItem', scope, kind, id });
  },

  deletePromptItem(scope: AgentItemScope, kind: AgentInstructionKind, id: string): void {
    post({ type: 'deletePromptItem', scope, kind, id });
  },

  setActivePromptConfig(instructionRefs: AgentItemRef[], modeRef?: AgentItemRef, presetId?: string): void {
    post({ type: 'setActivePromptConfig', instructionRefs, modeRef, presetId });
  },

  applyPromptPreset(presetId: string): void {
    post({ type: 'applyPromptPreset', presetId });
  },

  upsertPromptPreset(payload: {
    id?: string;
    label: string;
    instructionRefs: AgentItemRef[];
    modeRef?: AgentItemRef;
    scope?: AgentItemScope;
  }): void {
    post({ type: 'upsertPromptPreset', ...payload });
  },

  deletePromptPreset(presetId: string): void {
    post({ type: 'deletePromptPreset', presetId });
  },

  addSkill(
    scope: AgentItemScope,
    label: string,
    description: string,
    command: string,
    permission: ToolPermissionMode
  ): void {
    post({ type: 'addSkill', scope, label, description, command, permission });
  },

  updateSkill(payload: {
    scope: AgentItemScope;
    skillId: string;
    label: string;
    description: string;
    command: string;
    permission: ToolPermissionMode;
  }): void {
    post({ type: 'updateSkill', ...payload });
  },

  deleteSkill(scope: AgentItemScope, skillId: string): void {
    post({ type: 'deleteSkill', scope, skillId });
  },

  codexLogin(): void {
    post({ type: 'codexLogin' });
  },

  codexLogout(): void {
    post({ type: 'codexLogout' });
  },

  resolveToolCall(messageId: string, decision: 'approve' | 'deny-stop' | 'deny-continue', comment?: string): void {
    post({ type: 'resolveToolCall', messageId, decision, comment });
  },

  openWorkspaceFile(file: {
    path: string;
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
  }): void {
    post({ type: 'openWorkspaceFile', ...file });
  },

  copyMessage(markdown: string): void {
    post({ type: 'copyMessage', markdown });
  }
};
