import * as vscode from 'vscode';

import { ToolRunner } from '../../../core/toolRunner';
import type { Chat, OpenRouterMessage, ToolCall } from '../../../core/types';
import type { ChatStore } from '../../chats/chatStore';
import { t } from '../../shared/i18n';
import { getSkillPermission, runAgentSkill } from '../../skills/skills';
import { previewFilesystemTool, runFilesystemTool } from '../../tools/filesystemTools';
import { getToolPermission } from '../../tools/permissions';
import { getApprovalNotificationSettings } from '../config/notifications';
import { addAgentMemory } from '../memory/memory';
import type { AgentRun, ToolApprovalDecision } from '../types';
import { recordApprovalDecision, recordApprovalRequested, recordFailedEdit, recordToolStarted } from './telemetry';
import { getAgentToolRegistry } from './toolRegistry';

export type HandleAgentToolCallParams = {
  chat: Chat;
  workingMessages: OpenRouterMessage[];
  toolCall: ToolCall;
  run: AgentRun;
  chats: ChatStore;
  sendState(): void;
  throwIfStopped(run: AgentRun): void;
  askToolPermission(messageId: string, run: AgentRun): Promise<ToolApprovalDecision>;
};

/**
 * VS Code adapter for the core tool runner.
 *
 * UI storage, editable diff previews, permission notifications and extension
 * telemetry stay in the adapter; execution order and model-visible results are
 * owned by core.
 */
export function handleAgentToolCall(params: HandleAgentToolCallParams): Promise<void> {
  const registry = getAgentToolRegistry();
  const runner = new ToolRunner({
    registry,
    context: {
      appendToolMessage: (chatId, message) => params.chats.appendMessage(chatId, message),
      updateToolMessage: (chatId, messageId, patch) => params.chats.updateMessage(chatId, messageId, patch),
      setActivity: (chatId, activity, detail) => params.chats.setActivity(chatId, activity, detail),
      getActivePlan: (chatId) => params.chats.getChat(chatId)?.activePlan,
      setActivePlan: (chatId, activePlan) => params.chats.setActivePlan(chatId, activePlan),
      sendState: params.sendState,
      throwIfStopped: params.throwIfStopped
    },
    approvalService: {
      getPermission: getToolCallPermission,
      requestApproval: async (request) => {
        showApprovalSystemNotification(request.toolCall.function.name);
        return params.askToolPermission(request.messageId, params.run);
      }
    },
    filesystem: {
      execute: runFilesystemTool
    },
    projectTools: {
      execute: (toolName, args) => registry.runProjectTool(toolName, args)
    },
    skills: {
      execute: (_toolName, args) => runAgentSkill(args)
    },
    preview: {
      prepare: previewFilesystemTool
    },
    memory: {
      add: addAgentMemory
    },
    telemetry: {
      recordToolStarted: (toolName) => recordToolStarted(params.run.telemetry, toolName),
      recordApprovalRequested: () => recordApprovalRequested(params.run.telemetry),
      recordApprovalDecision: (approved) => recordApprovalDecision(params.run.telemetry, approved),
      recordFailedEdit: (toolName) => recordFailedEdit(params.run.telemetry, toolName)
    },
    activityFormatter: {
      prepare: (tool, reason) => t('activity.detail.prepareTool', { tool, reason }),
      waitingApproval: (tool, reason) => t('activity.detail.waitingApproval', { tool, reason }),
      runningTool: (tool, reason) => t('activity.detail.runningTool', { tool, reason })
    },
    getRunId: (run) => (run as AgentRun).telemetry?.runId
  });

  return runner.handleToolCall(params);
}

/**
 * Показывает системное уведомление VS Code только для критичного ожидания решения.
 * Звук остаётся в webview, потому что там доступен Web Audio; extension отвечает за OS/VS Code notification.
 */
export function showApprovalSystemNotification(toolName: string): void {
  const settings = getApprovalNotificationSettings();
  if (!settings.enabled || !settings.systemNotifications) {
    return;
  }

  void vscode.window.showInformationMessage(
    `${t('approval.notification.title')}: ${t('approval.notification.message', { tool: toolName })}`,
    { modal: false }
  );
}

export function getToolCallPermission(
  toolName: string,
  args: Record<string, unknown>
): ReturnType<typeof getToolPermission> {
  if (toolName === 'edit_file') {
    return 'ask';
  }

  const projectTool = getAgentToolRegistry().getProjectTool(toolName);
  if (projectTool) {
    return getToolPermission(toolName);
  }
  return toolName === 'run_skill' ? getSkillPermission(String(args.skillId || '')) : getToolPermission(toolName);
}
