import type { ChatStore } from '../../chats/chatStore';
import type { Chat, ChatUsageEstimate } from '../../chats/types';
import { getModelRequestErrorInfo } from '../../openrouter/errors';
import type {
  ModelRequestLifecycleCallbacks,
  ModelStreamCallbacks,
  OpenRouterMessage,
  OpenRouterModelOption,
  OpenRouterTool
} from '../../openrouter/types';
import { CODEX_RESPONSES_URL, OPENROUTER_URL } from '../../shared/constants';
import { t } from '../../shared/i18n';
import type { AistLogger } from '../../shared/logger';
import { getAgentSkills } from '../../skills/skills';
import { getDisabledProjectToolIds } from '../../tools/permissions';
import { getAgentSettingsSnapshot } from '../config/settingsSnapshot';
import type { AgentLoopResult, AgentRun } from '../types';
import { isRetryableModelRequestError } from './errors';
import { getPersistableHistory } from './runtime';
import { findRepeatedToolCall, getRepeatedToolCallAnswer, redactLargeArgs } from './toolCalls';
import { getAgentToolRegistry } from './toolRegistry';
import {
  createEmptyUsage,
  getCallUsageFromModelUsage,
  getChatContextEstimateFromModelUsage,
  mergeUsage
} from './usage';

export type RunAgentLoopDeps = {
  chats: ChatStore;
  logger: AistLogger;
  getSystemPrompt(): string;
  getModelOption(modelId: string): OpenRouterModelOption | undefined;
  chat(
    messages: OpenRouterMessage[],
    tools?: OpenRouterTool[],
    modelOverride?: string,
    signal?: AbortSignal,
    stream?: ModelStreamCallbacks,
    lifecycle?: ModelRequestLifecycleCallbacks
  ): Promise<OpenRouterMessage>;
  handleToolCall(
    chat: Chat,
    workingMessages: OpenRouterMessage[],
    toolCall: NonNullable<OpenRouterMessage['tool_calls']>[number],
    run: AgentRun
  ): Promise<void>;
  sendState(): void;
  throwIfStopped(run: AgentRun): void;
  requestAttempt: number;
  maxRequestAttempts: number;
};

/**
 * Выполняет основной цикл агента: модель → tool calls → модель.
 *
 * Модуль отделен от контроллера, потому что это доменный сценарий агента, а не
 * lifecycle VS Code webview. Контроллер передает callbacks для транспорта,
 * UI-состояния и выполнения tool call, сохраняя направление зависимостей простым.
 */
export async function runAgentLoop(
  chat: Chat,
  initialHistory: OpenRouterMessage[],
  run: AgentRun,
  deps: RunAgentLoopDeps
): Promise<AgentLoopResult> {
  const { maxToolIterations, streamingEnabled } = getAgentSettingsSnapshot();
  const workingMessages = createWorkingMessages(deps.getSystemPrompt(), initialHistory);
  const model = deps.getModelOption(chat.model);
  const usage: ChatUsageEstimate = createEmptyUsage();
  const toolCallCounts = new Map<string, number>();
  let modelRequestNumber = 0;

  for (let iteration = 0; maxToolIterations === 0 || iteration < maxToolIterations; iteration += 1) {
    deps.throwIfStopped(run);
    run.activityStream?.reset();
    deps.chats.setActivity(
      chat.id,
      'thinking',
      iteration > 0 ? t('activity.detail.requestModelAfterTools', { iteration }) : t('activity.detail.requestModel')
    );
    deps.sendState();

    const tools = (
      await getAgentToolRegistry().refresh({
        skills: getAgentSkills(),
        disabledProjectToolIds: getDisabledProjectToolIds()
      })
    ).tools;

    modelRequestNumber += 1;
    const responseMessage = await requestModel(
      chat,
      workingMessages,
      tools,
      run,
      deps,
      usage,
      model,
      streamingEnabled,
      modelRequestNumber
    );
    const toolCalls = Array.isArray(responseMessage.tool_calls) ? responseMessage.tool_calls : [];

    if (!toolCalls.length) {
      if (!run.activityStream?.hasContent()) {
        deps.chats.setActivity(
          chat.id,
          'answering',
          getResponseDetail(responseMessage, t('activity.detail.finalAnswer'))
        );
        deps.sendState();
      }
      return finishWithAnswer(workingMessages, responseMessage.content || '', responseMessage.reasoning, usage);
    }

    const repeatedToolCall = findRepeatedToolCall(toolCalls, toolCallCounts);
    if (repeatedToolCall) {
      const answer = getRepeatedToolCallAnswer(repeatedToolCall);
      deps.logger.info('Stopping repeated tool-call loop', {
        chatId: chat.id,
        toolName: repeatedToolCall.toolName,
        count: repeatedToolCall.count,
        args: redactLargeArgs(repeatedToolCall.args)
      });
      return finishWithAnswer(workingMessages, answer, undefined, usage);
    }

    deps.chats.setActivity(
      chat.id,
      'thinking',
      getResponseDetail(responseMessage, t('activity.detail.modelRequestedTools', { count: toolCalls.length }))
    );
    deps.sendState();

    workingMessages.push({
      role: 'assistant',
      content: responseMessage.content || '',
      reasoning: responseMessage.reasoning,
      tool_calls: toolCalls
    });

    for (const toolCall of toolCalls) {
      deps.throwIfStopped(run);
      await deps.handleToolCall(chat, workingMessages, toolCall, run);
    }

    deps.chats.setHistory(chat.id, getPersistableHistory(workingMessages));
  }

  return finishWithAnswer(
    workingMessages,
    'Stopped because the agent reached the tool iteration limit.',
    undefined,
    usage
  );
}

function createWorkingMessages(systemPrompt: string, initialHistory: OpenRouterMessage[]): OpenRouterMessage[] {
  return [{ role: 'system', content: systemPrompt }, ...initialHistory.filter((message) => message.role !== 'system')];
}

async function requestModel(
  chat: Chat,
  workingMessages: OpenRouterMessage[],
  tools: OpenRouterTool[],
  run: AgentRun,
  deps: RunAgentLoopDeps,
  usage: ChatUsageEstimate,
  model: OpenRouterModelOption | undefined,
  streamingEnabled: boolean,
  requestNumber: number
): Promise<OpenRouterMessage> {
  const startedAt = Date.now();
  const provider = model?.provider || (chat.model.startsWith('codex:') ? 'codex' : 'openrouter');
  const endpoint = provider === 'codex' ? CODEX_RESPONSES_URL : OPENROUTER_URL;
  deps.chats.setModelRequest(chat.id, {
    provider,
    model: chat.model,
    attempt: deps.requestAttempt,
    maxAttempts: deps.maxRequestAttempts,
    requestNumber,
    phase: 'sending',
    stream: streamingEnabled,
    startedAt,
    updatedAt: startedAt,
    endpoint,
    method: 'POST'
  });
  deps.sendState();

  let streamingMarked = false;
  const markStreaming = () => {
    if (streamingMarked) {
      return;
    }

    streamingMarked = true;
    deps.chats.updateModelRequest(chat.id, {
      phase: 'streaming',
      updatedAt: Date.now()
    });
    deps.sendState();
  };
  const streamCallbacks =
    streamingEnabled && run.activityStream
      ? createModelRequestStreamCallbacks(run.activityStream, markStreaming)
      : undefined;
  const lifecycle = createModelRequestLifecycle(chat.id, streamingEnabled, deps);

  try {
    const responseMessage = await deps.chat(
      workingMessages,
      tools,
      chat.model,
      run.abortController.signal,
      // Stream callbacks дают живой preview reasoning/answer, но требуют долгого SSE-соединения; non-streaming устойчивее.
      streamCallbacks,
      lifecycle
    );
    const finishedAt = Date.now();
    deps.chats.updateModelRequest(chat.id, {
      phase: 'completed',
      updatedAt: finishedAt,
      durationMs: finishedAt - startedAt,
      retryable: false
    });
    deps.sendState();

    const callUsage = getCallUsageFromModelUsage(responseMessage.usage, model?.pricing);
    const callContext = getChatContextEstimateFromModelUsage(responseMessage.usage, model);
    mergeUsage(usage, callUsage);
    if (callUsage) {
      deps.chats.addUsage(chat.id, callUsage);
    }
    if (callContext) {
      deps.chats.setContext(chat.id, callContext);
    }

    return responseMessage;
  } catch (error) {
    const finishedAt = Date.now();
    const info = getModelRequestErrorInfo(error);
    deps.chats.updateModelRequest(chat.id, {
      phase: run.stopRequested ? 'aborted' : 'failed',
      updatedAt: finishedAt,
      durationMs: finishedAt - startedAt,
      endpoint: info?.endpoint || endpoint,
      method: info?.method || 'POST',
      httpStatus: info?.status,
      httpStatusText: info?.statusText,
      error: getModelRequestErrorSummary(error, info),
      responseBody: info?.responseBody,
      retryable: isRetryableModelRequestError(error)
    });
    deps.sendState();
    throw error;
  }
}

function getModelRequestErrorSummary(error: unknown, info: ReturnType<typeof getModelRequestErrorInfo>): string {
  if (info?.message) {
    return info.message;
  }

  if (info?.status) {
    return `HTTP ${info.status}${info.statusText ? ` ${info.statusText}` : ''}`;
  }

  return error instanceof Error ? error.message : String(error);
}

function createModelRequestStreamCallbacks(
  activityStream: NonNullable<AgentRun['activityStream']>,
  onStreamStart: () => void
): ModelStreamCallbacks {
  return {
    onComplete: () => activityStream.onComplete?.(),
    onReasoningDelta: (delta) => {
      onStreamStart();
      activityStream.onReasoningDelta?.(delta);
    },
    onContentDelta: (delta) => {
      onStreamStart();
      activityStream.onContentDelta?.(delta);
    }
  };
}

function createModelRequestLifecycle(
  chatId: string,
  streamingEnabled: boolean,
  deps: RunAgentLoopDeps
): ModelRequestLifecycleCallbacks {
  return {
    onResponseHeaders: (info) => {
      deps.chats.updateModelRequest(chatId, {
        phase: info.status >= 400 ? 'failed' : streamingEnabled ? 'streaming' : 'receiving',
        httpStatus: info.status,
        httpStatusText: info.statusText,
        updatedAt: Date.now()
      });
      deps.sendState();
    }
  };
}

function getResponseDetail(message: OpenRouterMessage, fallback: string): string {
  const reasoning = normalizeText(message.reasoning);
  if (reasoning) {
    return t('activity.detail.reasoning', { text: truncateDetail(reasoning) });
  }

  const content = normalizeText(message.content);
  if (content) {
    return t('activity.detail.answerDraft', { text: truncateDetail(content) });
  }

  return fallback;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function truncateDetail(value: string): string {
  return value.length > 220 ? `${value.slice(0, 217).trimEnd()}...` : value;
}

function finishWithAnswer(
  workingMessages: OpenRouterMessage[],
  answer: string,
  reasoning: OpenRouterMessage['reasoning'],
  usage: ChatUsageEstimate
): AgentLoopResult {
  workingMessages.push({ role: 'assistant', content: answer, reasoning });

  return {
    answer,
    history: getPersistableHistory(workingMessages),
    usage
  };
}
