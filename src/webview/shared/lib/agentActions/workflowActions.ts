import type { AgentItemScope, AgentMemoryScope, ToolPermissionMode, WebviewRenderPerformanceMetric } from '../../types';
import { post } from './post';

/**
 * Что это: действия памяти, skills, approval, workspace files и VCS.
 * Зачем нужно: рабочие сценарии агента отделены от настроек модели и prompt profile.
 * Какую проблему решает: UI-компоненты вызывают продуктовые действия без сборки IPC payload вручную.
 */
export const workflowActions = {
  reportRenderPerformance(metric: Omit<WebviewRenderPerformanceMetric, 'type'>): void {
    post({ message: { type: 'performance.renderMetric', ...metric } });
  },
  setMemoryEnabled(scope: AgentMemoryScope, id: string, enabled: boolean): void {
    post({ message: { type: 'setMemoryEnabled', scope, id, enabled } });
  },
  deleteMemory(scope: AgentMemoryScope, id: string): void {
    post({ message: { type: 'deleteMemory', scope, id } });
  },
  saveReflectionCandidate(chatId: string, candidateId: string): void {
    post({ message: { type: 'saveReflectionCandidate', chatId, candidateId } });
  },
  rejectReflectionCandidate(chatId: string, candidateId: string): void {
    post({ message: { type: 'rejectReflectionCandidate', chatId, candidateId } });
  },
  runMemoryAnalysis(chatId: string): void {
    post({ message: { type: 'runMemoryAnalysis', chatId } });
  },
  addSkill(
    scope: AgentItemScope,
    label: string,
    description: string,
    command: string,
    permission: ToolPermissionMode
  ): void {
    post({ message: { type: 'addSkill', scope, label, description, command, permission } });
  },
  updateSkill(payload: {
    scope: AgentItemScope;
    skillId: string;
    label: string;
    description: string;
    command: string;
    permission: ToolPermissionMode;
  }): void {
    post({ message: { type: 'updateSkill', ...payload } });
  },
  deleteSkill(scope: AgentItemScope, skillId: string): void {
    post({ message: { type: 'deleteSkill', scope, skillId } });
  },
  codexLogin(): void {
    post({ message: { type: 'codexLogin' } });
  },
  codexLogout(): void {
    post({ message: { type: 'codexLogout' } });
  },
  resolveToolCall(
    messageId: string,
    decision: 'approve' | 'deny-stop' | 'deny-continue',
    payload?: { comment?: string; rememberGlobal?: string; rememberProject?: string }
  ): void {
    post({ message: { type: 'resolveToolCall', messageId, decision, ...payload } });
  },
  openWorkspaceFile(file: {
    path: string;
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
  }): void {
    post({ message: { type: 'openWorkspaceFile', ...file } });
  },
  copyMessage(markdown: string): void {
    post({ message: { type: 'copyMessage', markdown } });
  },
  refreshVcs(): void {
    post({ message: { type: 'vcs.refresh' } });
  },
  isolateChatVcs(): void {
    post({ message: { type: 'vcs.isolateChat' } });
  },
  commitAndForcePushVcs(): void {
    post({ message: { type: 'vcs.commitAndForcePush' } });
  },
  mergeToMainVcs(): void {
    post({ message: { type: 'vcs.mergeToMain' } });
  }
};
