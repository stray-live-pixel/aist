import { createEmptyUsage } from '../../../features/context/usage';
import type { AgentLoopResult, AgentRun, Chat, OpenRouterMessage } from '../../../shared/types/types';
import { createWorkingMessages } from '../stages/preparePrompt';
import { finishWithAnswer, withChatModelSettings } from '../stages/runModelLoop';
import { isAbortError, isRetryableModelRequestError } from '../stages/stopRun';
import { getConfig, setActivity, throwIfStopped, updateModelRequest } from './actions';
import type { AgentRuntimeContext } from './context';
import { getContextBytes } from './getContextBytes';
import { handleModelResponse } from './handleModelResponse';
import { refreshTools } from './refreshTools';
import { requestModel } from './requestModel';
import { MAX_MODEL_REQUEST_ATTEMPTS } from './types';

/**
 * Что это: запускает model/tool loop с retry для временных ошибок модели.
 * Зачем нужно: сетевые и provider-сбои не должны сразу ломать run, если их можно повторить.
 * Какую продуктовую проблему решает: агент устойчивее отвечает при нестабильном provider API.
 */
export async function runLoopWithRetries({
  context,
  chat,
  initialHistory,
  runId,
  run
}: {
  context: AgentRuntimeContext;
  chat: Chat;
  initialHistory: OpenRouterMessage[];
  runId: string;
  run: AgentRun<unknown>;
}): Promise<AgentLoopResult> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_MODEL_REQUEST_ATTEMPTS; attempt += 1) {
    throwIfStopped({ run });
    try {
      await showRetryActivityIfNeeded({ context, chat, runId, attempt });
      return await runLoop({ context, chat, initialHistory, runId, run, requestAttempt: attempt });
    } catch (error) {
      lastError = error;
      await handleRetryableModelError({ context, chat, run, runId, attempt, error });
    }
  }

  throw lastError;
}

async function runLoop({
  context,
  chat,
  initialHistory,
  runId,
  run,
  requestAttempt
}: {
  context: AgentRuntimeContext;
  chat: Chat;
  initialHistory: OpenRouterMessage[];
  runId: string;
  run: AgentRun<unknown>;
  requestAttempt: number;
}): Promise<AgentLoopResult> {
  const config = withChatModelSettings({ config: await getConfig({ context }), settings: chat.modelSettings });
  const systemPrompt = await context.deps.promptProvider.getSystemPrompt();
  const workingMessages = createWorkingMessages({ systemPrompt, initialHistory });
  context.deps.telemetry?.recordContextBytes?.(run.telemetry, getContextBytes({ messages: workingMessages }));
  const model = context.deps.modelCatalog?.getOption(chat.model);
  const usage = createEmptyUsage();
  const toolCallCounts = new Map<string, number>();
  let modelRequestNumber = 0;

  for (let iteration = 0; config.maxToolIterations === 0 || iteration < config.maxToolIterations; iteration += 1) {
    throwIfStopped({ run });
    run.activityStream?.reset();
    await setActivity({
      context,
      runId,
      chatId: chat.id,
      activity: 'thinking',
      detail: iteration > 0 ? context.text.requestModelAfterTools(iteration) : context.text.requestModel()
    });

    const tools = await refreshTools({ context, config });
    modelRequestNumber += 1;
    const responseMessage = await requestModel({
      context,
      params: {
        chat,
        workingMessages,
        tools,
        run,
        runId,
        usage,
        model,
        streamingEnabled: config.streamingEnabled,
        requestNumber: modelRequestNumber,
        requestAttempt
      }
    });
    const result = await handleModelResponse({
      context,
      chat,
      workingMessages,
      responseMessage,
      run,
      runId,
      usage,
      toolCallCounts
    });
    if (result) {
      return result;
    }
  }

  return finishWithAnswer({
    workingMessages,
    answer: 'Stopped because the agent reached the tool iteration limit.',
    reasoning: undefined,
    usage
  });
}

async function showRetryActivityIfNeeded({
  context,
  chat,
  runId,
  attempt
}: {
  context: AgentRuntimeContext;
  chat: Chat;
  runId: string;
  attempt: number;
}): Promise<void> {
  if (attempt <= 1) {
    return;
  }

  await setActivity({
    context,
    runId,
    chatId: chat.id,
    activity: 'thinking',
    detail: context.text.retryModelRequest(attempt, MAX_MODEL_REQUEST_ATTEMPTS)
  });
}

async function handleRetryableModelError({
  context,
  chat,
  run,
  runId,
  attempt,
  error
}: {
  context: AgentRuntimeContext;
  chat: Chat;
  run: AgentRun<unknown>;
  runId: string;
  attempt: number;
  error: unknown;
}): Promise<void> {
  if (run.stopRequested || isAbortError({ error }) || !isRetryableModelRequestError({ error })) {
    throw error;
  }

  context.deps.logger.error?.('Retryable model request failed', error);
  context.deps.reportError?.(error, {
    chatId: chat.id,
    context: `model request attempt ${attempt}/${MAX_MODEL_REQUEST_ATTEMPTS}`
  });
  if (attempt >= MAX_MODEL_REQUEST_ATTEMPTS) {
    throw error;
  }

  await updateModelRequest({
    context,
    runId,
    chatId: chat.id,
    patch: { phase: 'retrying', retryable: true, updatedAt: context.now() }
  });
}
