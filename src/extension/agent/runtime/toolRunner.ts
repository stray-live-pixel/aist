import type { ChatStore } from '../../chats/chatStore';
import type { Chat } from '../../chats/types';
import type { OpenRouterMessage, ToolCall } from '../../openrouter/types';
import { getErrorMessage } from '../../shared/errors';
import { t } from '../../shared/i18n';
import { getSkillPermission, runAgentSkill } from '../../skills/skills';
import { type FilesystemToolPreview, previewFilesystemTool, runFilesystemTool } from '../../tools/filesystemTools';
import { getToolPermission } from '../../tools/permissions';
import type { AgentRun } from '../types';
import { getToolReason, parseToolArguments } from './toolCalls';

export type HandleAgentToolCallParams = {
  chat: Chat;
  workingMessages: OpenRouterMessage[];
  toolCall: ToolCall;
  run: AgentRun;
  chats: ChatStore;
  sendState(): void;
  throwIfStopped(run: AgentRun): void;
  askToolPermission(messageId: string, run: AgentRun): Promise<boolean>;
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
      previewHandle = toolName === 'run_skill' ? undefined : await previewFilesystemTool(toolName, args);
      preview = previewHandle?.preview;
      await waitForToolApproval({ ...params, toolMessageId: toolMessage.id, reason, args, preview });
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

    const result = await runApprovedTool(toolName, args, previewHandle);
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
    const result = { ok: false, error: getErrorMessage(error) };
    params.chats.updateMessage(params.chat.id, toolMessage.id, {
      status: 'error',
      reason,
      args,
      result
    });
    params.workingMessages.push({
      role: 'tool',
      tool_call_id: params.toolCall.id,
      content: JSON.stringify(result)
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

async function waitForToolApproval(params: ApprovalParams): Promise<void> {
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
  params.sendState();

  const allowed = await params.askToolPermission(params.toolMessageId, params.run);
  if (!allowed) {
    denyToolCall(params);
    throw new ToolCallDeniedError();
  }
}

function denyToolCall(params: ApprovalParams): void {
  const result = { ok: false, error: 'The user denied this tool call.' };
  params.chats.updateMessage(params.chat.id, params.toolMessageId, {
    status: 'denied',
    approval: 'denied',
    reason: params.reason,
    args: params.args,
    result: params.preview ? { preview: params.preview, result } : result
  });
  params.workingMessages.push({
    role: 'tool',
    tool_call_id: params.toolCall.id,
    content: JSON.stringify(result)
  });
  params.sendState();
}

async function runApprovedTool(
  toolName: string,
  args: Record<string, unknown>,
  previewHandle?: FilesystemToolPreview
): Promise<Record<string, unknown>> {
  if (previewHandle) {
    return previewHandle.approve();
  }

  return toolName === 'run_skill' ? runAgentSkill(args) : runFilesystemTool(toolName, args);
}

function getToolCallPermission(toolName: string, args: Record<string, unknown>): ReturnType<typeof getToolPermission> {
  return toolName === 'run_skill' ? getSkillPermission(String(args.skillId || '')) : getToolPermission(toolName);
}

class ToolCallDeniedError extends Error {
  constructor() {
    super('The user denied this tool call.');
  }
}
