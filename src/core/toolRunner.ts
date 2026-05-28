import {
  type NormalizedToolApprovalDecision,
  createToolApprovalRequest,
  normalizeToolApprovalDecision
} from './approvalProtocol';
import { type AgentMemoryCandidate } from './memory';
import { createPlanFromArgs, updatePlanItemStatus } from './planningTools';
import type { RunApprovalInput, RunToolResultInput } from './runRepository';
import { toStructuredToolFailure } from './toolErrors';
import type { ToolRegistry } from './toolRegistry';
import { buildModelToolResult } from './toolResultCompaction';
import type {
  AgentRun,
  Chat,
  ChatMessage,
  ChatPlan,
  JsonObject,
  JsonValue,
  OpenRouterMessage,
  RuntimeEvent,
  RuntimeToolCallSnapshot,
  RuntimeToolResult,
  ToolApprovalDecision,
  ToolApprovalRequest,
  ToolCall,
  ToolPermissionMode
} from './types';

export type ToolExecutionPreview = {
  preview: Record<string, unknown>;
  approve(): Promise<Record<string, unknown>>;
  cleanup(): Promise<void>;
};

export type ToolRunnerExecutionAdapter = {
  execute(toolName: string, args: Record<string, unknown>): Promise<Record<string, unknown>>;
};

export type ToolRunnerPreviewAdapter = {
  prepare(toolName: string, args: Record<string, unknown>): Promise<ToolExecutionPreview | undefined>;
};

export type ToolRunnerApprovalRequest = {
  chat: Chat;
  run: AgentRun;
  toolCall: ToolCall;
  messageId: string;
  reason: string;
  args: Record<string, unknown>;
  preview?: Record<string, unknown>;
};

export type ToolRunnerApprovalService = {
  getPermission(toolName: string, args: Record<string, unknown>): ToolPermissionMode;
  requestApproval(request: ToolRunnerApprovalRequest): Promise<ToolApprovalDecision>;
};

export type ToolRunnerMutableContext = {
  appendToolMessage(chatId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage | Promise<ChatMessage>;
  updateToolMessage(
    chatId: string,
    messageId: string,
    patch: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>
  ): ChatMessage | Promise<ChatMessage>;
  setActivity(chatId: string, activity: Chat['activity'], detail?: string): void | Promise<void>;
  getActivePlan(chatId: string): ChatPlan | undefined;
  setActivePlan(chatId: string, activePlan: ChatPlan): void | Promise<void>;
  sendState?(): void;
  throwIfStopped(run: AgentRun): void;
};

export type ToolRunnerTelemetryRecorder = {
  recordToolStarted?(toolName: string): void;
  recordApprovalRequested?(): void;
  recordApprovalDecision?(approved: boolean): void;
  recordFailedEdit?(toolName: string): void;
};

export type ToolRunnerMemoryService = {
  add(candidate: AgentMemoryCandidate): Promise<unknown>;
};

export type ToolRunnerEventEmitter = {
  emit(event: RuntimeEvent): void | Promise<void>;
};

export type ToolRunnerRunRepository = {
  appendApproval?(runId: string, approval: RunApprovalInput): Promise<unknown>;
  appendToolResult?(runId: string, result: RunToolResultInput): Promise<unknown>;
};

export type ToolRunnerActivityFormatter = {
  prepare(toolName: string, reason: string): string;
  waitingApproval(toolName: string, reason: string): string;
  runningTool(toolName: string, reason: string): string;
};

export type ToolRunnerDeps = {
  registry: ToolRegistry;
  context: ToolRunnerMutableContext;
  approvalService: ToolRunnerApprovalService;
  filesystem: ToolRunnerExecutionAdapter;
  projectTools?: ToolRunnerExecutionAdapter;
  skills?: ToolRunnerExecutionAdapter;
  preview?: ToolRunnerPreviewAdapter;
  memory?: ToolRunnerMemoryService;
  telemetry?: ToolRunnerTelemetryRecorder;
  events?: ToolRunnerEventEmitter;
  runRepository?: ToolRunnerRunRepository;
  workspaceRoot?: string;
  activityFormatter?: ToolRunnerActivityFormatter;
  now?: () => number;
  getRunId?(run: AgentRun): string | undefined;
};

export type ToolRunnerHandleParams = {
  chat: Chat;
  workingMessages: OpenRouterMessage[];
  toolCall: ToolCall;
  run: AgentRun;
  runId?: string;
};

export class ToolRunner {
  private readonly now: () => number;
  private readonly activityFormatter: ToolRunnerActivityFormatter;

  constructor(private readonly deps: ToolRunnerDeps) {
    this.now = deps.now || Date.now;
    this.activityFormatter = deps.activityFormatter || defaultActivityFormatter;
  }

  async handleToolCall(params: ToolRunnerHandleParams): Promise<void> {
    const toolName = params.toolCall.function.name;
    const runId = this.getRunId(params);
    const args = parseToolArguments(params.toolCall.function.arguments);
    const reason = getToolReason(args);
    this.deps.telemetry?.recordToolStarted?.(toolName);

    const toolMessage = await this.deps.context.appendToolMessage(params.chat.id, {
      role: 'tool',
      name: toolName,
      status: 'waiting',
      reason,
      args
    });
    await this.deps.context.setActivity(params.chat.id, 'thinking', this.activityFormatter.prepare(toolName, reason));
    await this.emitToolStarted(params, runId, toolMessage.id, args, reason);
    this.deps.context.sendState?.();

    let previewHandle: ToolExecutionPreview | undefined;
    let preview: Record<string, unknown> | undefined;

    try {
      this.deps.context.throwIfStopped(params.run);
      const permission = this.deps.approvalService.getPermission(toolName, args);
      const registeredTool = this.deps.registry.getTool(toolName);

      if (permission === 'ask') {
        previewHandle =
          !registeredTool || registeredTool.kind === 'builtin'
            ? await this.deps.preview?.prepare(toolName, args)
            : undefined;
        preview = previewHandle?.preview;
        const approval = await this.waitForApproval({
          ...params,
          runId,
          toolMessageId: toolMessage.id,
          reason,
          args,
          preview
        });
        if (!approval.approved) {
          return;
        }
        if (approval.comment) {
          toolMessage.userApprovalComment = approval.comment;
        }
      }

      this.deps.context.throwIfStopped(params.run);
      await this.deps.context.setActivity(
        params.chat.id,
        'runningTool',
        this.activityFormatter.runningTool(toolName, reason)
      );
      await this.deps.context.updateToolMessage(params.chat.id, toolMessage.id, {
        status: 'running',
        approval: permission === 'ask' ? 'approved' : undefined,
        reason,
        args,
        result: preview ? { preview } : undefined
      });
      this.deps.context.sendState?.();

      const result = withApprovalComment(
        await this.runApprovedTool(toolName, args, params.chat.id, previewHandle),
        toolMessage.userApprovalComment
      );
      if (result.ok === false) {
        this.deps.telemetry?.recordFailedEdit?.(toolName);
      }

      const uiResult = preview ? { preview, result } : result;
      const modelResult = buildModelToolResult(toolName, args, uiResult);
      await this.deps.context.updateToolMessage(params.chat.id, toolMessage.id, {
        status: result.ok === false ? 'error' : 'done',
        reason,
        args,
        result: uiResult,
        modelResult
      });
      params.workingMessages.push({
        role: 'tool',
        tool_call_id: params.toolCall.id,
        content: JSON.stringify(modelResult, null, 2)
      });
      await this.persistToolResult(params, runId, toolMessage.id, args, reason, uiResult, modelResult);
      await this.emitToolCompleted(params, runId, toolMessage.id, args, reason, uiResult, modelResult);
    } catch (error) {
      if (error instanceof ToolCallDeniedError) {
        if (params.run.stopRequested) {
          throw error;
        }
        return;
      }

      const result = toStructuredToolFailure(error);
      this.deps.telemetry?.recordFailedEdit?.(toolName);
      const modelResult = buildModelToolResult(toolName, args, result);
      await this.deps.context.updateToolMessage(params.chat.id, toolMessage.id, {
        status: 'error',
        reason,
        args,
        result,
        modelResult
      });
      params.workingMessages.push({
        role: 'tool',
        tool_call_id: params.toolCall.id,
        content: JSON.stringify(modelResult, null, 2)
      });
      await this.persistToolResult(params, runId, toolMessage.id, args, reason, result, modelResult);
      await this.emitToolFailed(params, runId, toolMessage.id, args, reason, result);
    } finally {
      await previewHandle?.cleanup();
    }

    this.deps.context.sendState?.();
  }

  private async waitForApproval(
    params: ToolRunnerHandleParams & {
      runId: string | undefined;
      toolMessageId: string;
      reason: string;
      args: Record<string, unknown>;
      preview: Record<string, unknown> | undefined;
    }
  ): Promise<{ approved: boolean; comment?: string }> {
    if (params.preview) {
      await this.deps.context.updateToolMessage(params.chat.id, params.toolMessageId, {
        result: { preview: params.preview }
      });
      this.deps.context.sendState?.();
    }

    await this.deps.context.setActivity(
      params.chat.id,
      'waitingForApproval',
      this.activityFormatter.waitingApproval(params.toolCall.function.name, params.reason)
    );
    await this.deps.context.updateToolMessage(params.chat.id, params.toolMessageId, {
      status: 'waiting',
      approval: 'pending',
      result: params.preview ? { preview: params.preview } : undefined
    });
    this.deps.context.sendState?.();

    const approval = params.runId
      ? createToolApprovalRequest({
          runId: params.runId,
          chatId: params.chat.id,
          messageId: params.toolMessageId,
          toolCallId: params.toolCall.id,
          toolName: params.toolCall.function.name,
          reason: params.reason,
          args: params.args,
          previewKind: params.preview ? 'headless-diff-artifact' : 'none'
        })
      : undefined;
    if (params.runId && approval) {
      await this.deps.runRepository?.appendApproval?.(params.runId, {
        chatId: params.chat.id,
        messageId: params.toolMessageId,
        approvalId: approval.approvalId,
        status: 'requested',
        approval,
        toolCall: toToolCallSnapshot(params.toolCall, params.args, params.reason)
      });
    }
    await this.emitApprovalRequested(params, approval?.approvalId, approval);

    this.deps.telemetry?.recordApprovalRequested?.();
    const decision = normalizeToolApprovalDecision(
      await this.deps.approvalService.requestApproval({
        chat: params.chat,
        run: params.run,
        toolCall: params.toolCall,
        messageId: params.toolMessageId,
        reason: params.reason,
        args: params.args,
        preview: params.preview
      })
    );
    this.deps.telemetry?.recordApprovalDecision?.(decision.approved);
    await this.saveApprovalMemory(decision);
    this.deps.context.sendState?.();

    const resolvedApproval = approval
      ? {
          ...approval,
          status: decision.approved ? ('approved' as const) : ('denied' as const),
          updatedAt: this.now()
        }
      : undefined;
    if (params.runId && resolvedApproval) {
      await this.deps.runRepository?.appendApproval?.(params.runId, {
        chatId: params.chat.id,
        messageId: params.toolMessageId,
        approvalId: resolvedApproval.approvalId,
        status: resolvedApproval.status,
        approval: resolvedApproval,
        decision,
        resolvedAt: resolvedApproval.updatedAt,
        toolCall: toToolCallSnapshot(params.toolCall, params.args, params.reason)
      });
    }
    await this.emitApprovalResolved(params, resolvedApproval?.approvalId, resolvedApproval, decision);

    if (!decision.approved) {
      await this.denyToolCall(params, decision);
      if (!decision.continueAfterDeny) {
        params.run.stopRequested = true;
        throw new ToolCallDeniedError();
      }
      return { approved: false };
    }

    return { approved: true, comment: decision.comment };
  }

  private async saveApprovalMemory(decision: ToolApprovalDecision): Promise<void> {
    const candidates = [
      decision.rememberGlobal ? { scope: 'global' as const, note: decision.rememberGlobal } : undefined,
      decision.rememberProject ? { scope: 'project' as const, note: decision.rememberProject } : undefined
    ].filter((candidate): candidate is AgentMemoryCandidate => Boolean(candidate));

    for (const candidate of candidates) {
      try {
        await this.deps.memory?.add(candidate);
      } catch (error) {
        console.error('[aist] Failed to save approval memory', error);
      }
    }
  }

  private async denyToolCall(
    params: ToolRunnerHandleParams & {
      runId: string | undefined;
      toolMessageId: string;
      reason: string;
      args: Record<string, unknown>;
      preview: Record<string, unknown> | undefined;
    },
    decision: NormalizedToolApprovalDecision
  ): Promise<void> {
    const result: Record<string, unknown> = {
      ok: false,
      decision: 'denied',
      comment: decision.comment || '',
      continueAfterDeny: decision.continueAfterDeny
    };
    if (decision.comment) {
      result.userApprovalComment = decision.comment;
    }
    const uiResult = params.preview ? { preview: params.preview, result } : result;
    const modelResult = buildModelToolResult(params.toolCall.function.name, params.args, uiResult);
    await this.deps.context.updateToolMessage(params.chat.id, params.toolMessageId, {
      status: 'denied',
      approval: 'denied',
      reason: params.reason,
      args: params.args,
      result: uiResult,
      modelResult,
      userApprovalComment: decision.comment
    });
    params.workingMessages.push({
      role: 'tool',
      tool_call_id: params.toolCall.id,
      content: JSON.stringify(modelResult)
    });
    await this.persistToolResult(
      params,
      params.runId,
      params.toolMessageId,
      params.args,
      params.reason,
      uiResult,
      modelResult
    );
    await this.emitToolCompleted(
      params,
      params.runId,
      params.toolMessageId,
      params.args,
      params.reason,
      uiResult,
      modelResult
    );
    this.deps.context.sendState?.();
  }

  private async runApprovedTool(
    toolName: string,
    args: Record<string, unknown>,
    chatId: string,
    previewHandle?: ToolExecutionPreview
  ): Promise<Record<string, unknown>> {
    if (previewHandle) {
      return previewHandle.approve();
    }

    const tool = this.deps.registry.getTool(toolName);
    switch (tool?.kind) {
      case 'planning':
        return this.runPlanningTool(toolName, args, chatId);
      case 'project':
        return this.runProjectTool(toolName, args);
      case 'skill':
        return this.runSkillTool(toolName, args);
      case 'builtin':
      default:
        return this.deps.filesystem.execute(toolName, args);
    }
  }

  private async runPlanningTool(
    toolName: string,
    args: Record<string, unknown>,
    chatId: string
  ): Promise<Record<string, unknown>> {
    if (toolName === 'create_plan' || toolName === 'update_plan') {
      const plan = createPlanFromArgs(args);
      await this.deps.context.setActivePlan(chatId, plan);
      return { ok: true, action: toolName, title: plan.title, itemCount: plan.items.length };
    }

    const plan = updatePlanItemStatus(this.deps.context.getActivePlan(chatId), args);
    await this.deps.context.setActivePlan(chatId, plan);
    return {
      ok: true,
      action: toolName,
      itemIndex: Number(args.itemIndex),
      status: String(args.status),
      title: plan.title
    };
  }

  private runProjectTool(toolName: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (this.deps.projectTools) {
      return this.deps.projectTools.execute(toolName, args);
    }
    if (!this.deps.workspaceRoot) {
      throw new Error(`Project tool adapter is missing for ${toolName}.`);
    }
    return this.deps.registry.runProjectTool(toolName, args, this.deps.workspaceRoot);
  }

  private runSkillTool(toolName: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.deps.skills) {
      throw new Error(`Skill tool adapter is missing for ${toolName}.`);
    }
    return this.deps.skills.execute(toolName, args);
  }

  private getRunId(params: ToolRunnerHandleParams): string | undefined {
    return params.runId || this.deps.getRunId?.(params.run) || getTelemetryRunId(params.run.telemetry);
  }

  private async persistToolResult(
    params: ToolRunnerHandleParams,
    runId: string | undefined,
    messageId: string,
    args: Record<string, unknown>,
    reason: string,
    result: Record<string, unknown>,
    modelResult: Record<string, unknown>
  ): Promise<void> {
    if (!runId) {
      return;
    }
    await this.deps.runRepository?.appendToolResult?.(runId, {
      chatId: params.chat.id,
      messageId,
      toolCall: toToolCallSnapshot(params.toolCall, args, reason),
      result: toRuntimeToolResult(result),
      modelResult: toRuntimeToolResult(modelResult)
    });
  }

  private async emitToolStarted(
    params: ToolRunnerHandleParams,
    runId: string | undefined,
    messageId: string,
    args: Record<string, unknown>,
    reason: string
  ): Promise<void> {
    if (!runId) {
      return;
    }
    await this.deps.events?.emit({
      type: 'tool.call.started',
      runId,
      chatId: params.chat.id,
      messageId,
      toolCall: toToolCallSnapshot(params.toolCall, args, reason),
      at: this.now()
    });
  }

  private async emitApprovalRequested(
    params: ToolRunnerHandleParams & {
      runId: string | undefined;
      toolMessageId: string;
      reason: string;
      args: Record<string, unknown>;
      preview: Record<string, unknown> | undefined;
    },
    approvalId: string | undefined,
    approval: ToolApprovalRequest | undefined
  ): Promise<void> {
    if (!params.runId || !approvalId || !approval) {
      return;
    }
    await this.deps.events?.emit({
      type: 'tool.call.approvalRequested',
      runId: params.runId,
      chatId: params.chat.id,
      approvalId,
      messageId: params.toolMessageId,
      approval,
      toolCall: toToolCallSnapshot(params.toolCall, params.args, params.reason),
      preview: params.preview ? toRuntimeToolResult(params.preview) : undefined,
      at: this.now()
    });
  }

  private async emitApprovalResolved(
    params: ToolRunnerHandleParams & {
      runId: string | undefined;
      toolMessageId: string;
      reason: string;
      args: Record<string, unknown>;
    },
    approvalId: string | undefined,
    approval: ToolApprovalRequest | undefined,
    decision: ToolApprovalDecision
  ): Promise<void> {
    if (!params.runId || !approvalId) {
      return;
    }
    await this.deps.events?.emit({
      type: 'tool.call.approvalResolved',
      runId: params.runId,
      chatId: params.chat.id,
      approvalId,
      messageId: params.toolMessageId,
      approval,
      decision,
      at: this.now()
    });
  }

  private async emitToolCompleted(
    params: ToolRunnerHandleParams,
    runId: string | undefined,
    messageId: string,
    args: Record<string, unknown>,
    reason: string,
    result: Record<string, unknown>,
    modelResult: Record<string, unknown>
  ): Promise<void> {
    if (!runId) {
      return;
    }
    await this.deps.events?.emit({
      type: 'tool.call.completed',
      runId,
      chatId: params.chat.id,
      messageId,
      toolCall: toToolCallSnapshot(params.toolCall, args, reason),
      result: toRuntimeToolResult(result),
      modelResult: toRuntimeToolResult(modelResult),
      at: this.now()
    });
  }

  private async emitToolFailed(
    params: ToolRunnerHandleParams,
    runId: string | undefined,
    messageId: string,
    args: Record<string, unknown>,
    reason: string,
    result: Record<string, unknown>
  ): Promise<void> {
    if (!runId) {
      return;
    }
    await this.deps.events?.emit({
      type: 'tool.call.failed',
      runId,
      chatId: params.chat.id,
      messageId,
      toolCall: toToolCallSnapshot(params.toolCall, args, reason),
      error: {
        message: typeof result.error === 'string' ? result.error : 'Tool execution failed.',
        code: typeof result.code === 'string' ? result.code : undefined
      },
      at: this.now()
    });
  }
}

export class ToolCallDeniedError extends Error {
  constructor() {
    super('The user denied this tool call.');
  }
}

const defaultActivityFormatter: ToolRunnerActivityFormatter = {
  prepare: (toolName, reason) => `Preparing tool ${toolName}: ${reason}`,
  waitingApproval: (toolName, reason) => `Waiting for approval for ${toolName}: ${reason}`,
  runningTool: (toolName, reason) => `Running tool ${toolName}: ${reason}`
};

function parseToolArguments(rawArgs: unknown): Record<string, unknown> {
  if (!rawArgs) {
    return {};
  }

  if (typeof rawArgs === 'object' && !Array.isArray(rawArgs)) {
    return rawArgs as Record<string, unknown>;
  }

  try {
    const parsed = JSON.parse(String(rawArgs));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getToolReason(args: Record<string, unknown>): string {
  const reason = args.reason;
  return typeof reason === 'string' && reason.trim() ? reason.trim() : 'No reason provided by the model.';
}

function withApprovalComment(result: Record<string, unknown>, comment: string | undefined): Record<string, unknown> {
  return comment ? { ...result, userApprovalComment: comment } : result;
}

function toToolCallSnapshot(
  toolCall: ToolCall,
  args: Record<string, unknown>,
  reason: string
): RuntimeToolCallSnapshot {
  return {
    id: toolCall.id,
    name: toolCall.function.name,
    args: toJsonObject(args),
    reason
  };
}

function toRuntimeToolResult(result: Record<string, unknown>): RuntimeToolResult {
  return toJsonObject(result);
}

function toJsonObject(value: Record<string, unknown>): JsonObject {
  const result: JsonObject = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = toJsonValue(item);
  }
  return result;
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item) ?? null);
  }
  if (value && typeof value === 'object') {
    return toJsonObject(value as Record<string, unknown>);
  }
  return String(value);
}

function getTelemetryRunId(telemetry: unknown): string | undefined {
  return telemetry && typeof telemetry === 'object' && typeof (telemetry as Record<string, unknown>).runId === 'string'
    ? String((telemetry as Record<string, unknown>).runId)
    : undefined;
}
