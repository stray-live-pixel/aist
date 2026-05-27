import * as vscode from 'vscode';

import type { ChatStore } from '../../chats/chatStore';
import type { Chat } from '../../chats/types';
import type { OpenRouterMessage, ToolCall } from '../../openrouter/types';
import { t } from '../../shared/i18n';
import { toStructuredToolFailure } from '../../shared/toolErrors';
import { getSkillPermission, runAgentSkill } from '../../skills/skills';
import { type FilesystemToolPreview, previewFilesystemTool, runFilesystemTool } from '../../tools/filesystemTools';
import { getToolPermission } from '../../tools/permissions';
import { createPlanFromArgs, isPlanningTool, updatePlanItemStatus } from '../../tools/planningTools';
import { getApprovalNotificationSettings } from '../config/notifications';
import type { AgentRun, ToolApprovalDecision } from '../types';
import { getToolReason, parseToolArguments } from './toolCalls';

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
 * Выполняет один tool call модели и синхронизирует его отображение в чате.
 *
 * Здесь собраны preview, permission prompt, запуск filesystem/skill инструмента
 * и запись tool-result обратно в history. Контроллеру остается только управлять
 * жизненным циклом запуска, а agent loop — порядком вызовов модели.
 */
export async function handleAgentToolCall(params: HandleAgentToolCallParams): Promise<void> {
  const toolName = params.toolCall.function.name;
  const args = parseToolArguments(params.toolCall.function.arguments);
  const reason = getToolReason(args);
  const toolMessage = params.chats.appendMessage(params.chat.id, {
    role: 'tool',
    name: toolName,
    status: 'waiting',
    reason,
    args
  });
  params.chats.setActivity(params.chat.id, 'thinking', t('activity.detail.prepareTool', { tool: toolName, reason }));
  params.sendState();

  let previewHandle: FilesystemToolPreview | undefined;
  let preview: Record<string, unknown> | undefined;

  try {
    params.throwIfStopped(params.run);
    const permission = getToolCallPermission(toolName, args);

    if (permission === 'ask') {
      previewHandle =
        toolName === 'run_skill' || isPlanningTool(toolName) ? undefined : await previewFilesystemTool(toolName, args);
      preview = previewHandle?.preview;
      const approval = await waitForToolApproval({ ...params, toolMessageId: toolMessage.id, reason, args, preview });
      if (!approval.approved) {
        return;
      }
      if (approval.comment) {
        toolMessage.userApprovalComment = approval.comment;
      }
    }

    params.throwIfStopped(params.run);
    params.chats.setActivity(
      params.chat.id,
      'runningTool',
      t('activity.detail.runningTool', { tool: toolName, reason })
    );
    params.chats.updateMessage(params.chat.id, toolMessage.id, {
      status: 'running',
      approval: permission === 'ask' ? 'approved' : undefined,
      reason,
      args,
      result: preview ? { preview } : undefined
    });
    params.sendState();

    const result = withApprovalComment(
      await runApprovedTool(toolName, args, params.chat.id, params.chats, previewHandle),
      toolMessage.userApprovalComment
    );
    params.chats.updateMessage(params.chat.id, toolMessage.id, {
      status: result.ok === false ? 'error' : 'done',
      reason,
      args,
      result: preview ? { preview, result } : result
    });
    params.workingMessages.push({
      role: 'tool',
      tool_call_id: params.toolCall.id,
      content: JSON.stringify(result, null, 2)
    });
  } catch (error) {
    if (error instanceof ToolCallDeniedError) {
      if (params.run.stopRequested) {
        throw error;
      }
      return;
    }

    const result = toStructuredToolFailure(error);
    params.chats.updateMessage(params.chat.id, toolMessage.id, {
      status: 'error',
      reason,
      args,
      result
    });
    params.workingMessages.push({
      role: 'tool',
      tool_call_id: params.toolCall.id,
      content: JSON.stringify(result, null, 2)
    });
  } finally {
    await previewHandle?.cleanup();
  }

  params.sendState();
}

type ApprovalParams = HandleAgentToolCallParams & {
  toolMessageId: string;
  reason: string;
  args: Record<string, unknown>;
  preview: Record<string, unknown> | undefined;
};

async function waitForToolApproval(params: ApprovalParams): Promise<{ approved: boolean; comment?: string }> {
  if (params.preview) {
    params.chats.updateMessage(params.chat.id, params.toolMessageId, {
      result: { preview: params.preview }
    });
    params.sendState();
  }

  params.chats.setActivity(
    params.chat.id,
    'waitingForApproval',
    t('activity.detail.waitingApproval', { tool: params.toolCall.function.name, reason: params.reason })
  );
  params.chats.updateMessage(params.chat.id, params.toolMessageId, {
    status: 'waiting',
    approval: 'pending',
    result: params.preview ? { preview: params.preview } : undefined
  });
  showApprovalSystemNotification(params.toolCall.function.name);
  params.sendState();

  const decision = await params.askToolPermission(params.toolMessageId, params.run);
  if (!decision.approved) {
    denyToolCall(params, decision);
    if (!decision.continueAfterDeny) {
      params.run.stopRequested = true;
      throw new ToolCallDeniedError();
    }
    return { approved: false };
  }

  return { approved: true, comment: decision.comment };
}

/**
 * Показывает системное уведомление VS Code только для критичного ожидания решения.
 * Звук остаётся в webview, потому что там доступен Web Audio; extension отвечает за OS/VS Code notification.
 */
function showApprovalSystemNotification(toolName: string): void {
  const settings = getApprovalNotificationSettings();
  if (!settings.enabled || !settings.systemNotifications) {
    return;
  }

  void vscode.window.showInformationMessage(
    `${t('approval.notification.title')}: ${t('approval.notification.message', { tool: toolName })}`,
    { modal: false }
  );
}

/**
 * Фиксирует отказ как результат tool-call.
 * Если пользователь выбрал «продолжить», модель увидит этот результат и сможет построить следующий шаг
 * без выполнения опасного действия; если выбрана остановка — выше будет выброшена ошибка остановки цикла.
 */
function denyToolCall(params: ApprovalParams, decision: ToolApprovalDecision): void {
  const result: Record<string, unknown> = {
    ok: false,
    decision: 'denied',
    comment: decision.comment || '',
    continueAfterDeny: decision.continueAfterDeny
  };
  if (decision.comment) {
    result.userApprovalComment = decision.comment;
  }
  params.chats.updateMessage(params.chat.id, params.toolMessageId, {
    status: 'denied',
    approval: 'denied',
    reason: params.reason,
    args: params.args,
    result: params.preview ? { preview: params.preview, result } : result,
    userApprovalComment: decision.comment
  });
  params.workingMessages.push({
    role: 'tool',
    tool_call_id: params.toolCall.id,
    content: JSON.stringify(result)
  });
  params.sendState();
}

function withApprovalComment(result: Record<string, unknown>, comment: string | undefined): Record<string, unknown> {
  return comment ? { ...result, userApprovalComment: comment } : result;
}

async function runApprovedTool(
  toolName: string,
  args: Record<string, unknown>,
  chatId: string,
  chats: ChatStore,
  previewHandle?: FilesystemToolPreview
): Promise<Record<string, unknown>> {
  if (previewHandle) {
    return previewHandle.approve();
  }

  if (isPlanningTool(toolName)) {
    return runPlanningTool(toolName, args, chatId, chats);
  }

  return toolName === 'run_skill' ? runAgentSkill(args) : runFilesystemTool(toolName, args);
}

/**
 * Применяет planning tool к активному чату и возвращает короткий результат для history.
 * Подробный актуальный план UI берёт из chat.activePlan, поэтому tool-card остаётся статичной записью действия.
 */
function runPlanningTool(
  toolName: string,
  args: Record<string, unknown>,
  chatId: string,
  chats: ChatStore
): Record<string, unknown> {
  if (toolName === 'create_plan' || toolName === 'update_plan') {
    const plan = createPlanFromArgs(args);
    chats.setActivePlan(chatId, plan);
    return { ok: true, action: toolName, title: plan.title, itemCount: plan.items.length };
  }

  const chat = chats.getChat(chatId);
  const plan = updatePlanItemStatus(chat?.activePlan, args);
  chats.setActivePlan(chatId, plan);
  return {
    ok: true,
    action: toolName,
    itemIndex: Number(args.itemIndex),
    status: String(args.status),
    title: plan.title
  };
}

function getToolCallPermission(toolName: string, args: Record<string, unknown>): ReturnType<typeof getToolPermission> {
  return toolName === 'run_skill' ? getSkillPermission(String(args.skillId || '')) : getToolPermission(toolName);
}

class ToolCallDeniedError extends Error {
  constructor() {
    super('The user denied this tool call.');
  }
}
