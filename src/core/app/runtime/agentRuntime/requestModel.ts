import { CODEX_RESPONSES_URL, OPENROUTER_URL } from '../../../entities/model/modelDefaults';
import { getModelRequestErrorInfo } from '../../../entities/model/modelErrors';
import {
  getCallUsageFromModelUsage,
  getChatContextEstimateFromModelUsage,
  mergeUsage
} from '../../../features/context/usage';
import type {
  AgentRun,
  Chat,
  ChatUsageEstimate,
  OpenRouterMessage,
  OpenRouterModelOption,
  OpenRouterTool
} from '../../../shared/types/types';
import { isRetryableModelRequestError } from '../stages/stopRun';
import { emit, setModelRequest, updateModelRequest } from './actions';
import type { AgentRuntimeContext } from './context';
import { createModelRequestLifecycle } from './createModelRequestLifecycle';
import { createModelRequestStreamCallbacks } from './createModelRequestStreamCallbacks';
import { getModelRequestErrorSummary } from './getModelRequestErrorSummary';
import { toRuntimeModelMessage } from './toRuntimeModelMessage';
import { MAX_MODEL_REQUEST_ATTEMPTS } from './types';

/**
 * Что это: выполняет один запрос к модели и синхронизирует usage/status/events.
 * Зачем нужно: model loop получает готовое assistant message, а request lifecycle остаётся в одном месте.
 * Какую продуктовую проблему решает: пользователь видит точный статус provider request и итоговую стоимость/контекст.
 */
export async function requestModel({
  context,
  params
}: {
  context: AgentRuntimeContext;
  params: {
    chat: Chat;
    workingMessages: OpenRouterMessage[];
    tools?: OpenRouterTool[];
    run: AgentRun<unknown>;
    runId: string;
    usage: ChatUsageEstimate;
    model: OpenRouterModelOption | undefined;
    streamingEnabled: boolean;
    requestNumber: number;
    requestAttempt: number;
  };
}): Promise<OpenRouterMessage> {
  const startedAt = context.now();
  context.deps.telemetry?.recordModelRequest?.(params.run.telemetry);
  const provider = params.model?.provider || (params.chat.model.startsWith('codex:') ? 'codex' : 'openrouter');
  const endpoint = provider === 'codex' ? CODEX_RESPONSES_URL : OPENROUTER_URL;
  await setModelRequest({
    context,
    runId: params.runId,
    chatId: params.chat.id,
    request: {
      provider,
      model: params.chat.model,
      attempt: params.requestAttempt,
      maxAttempts: MAX_MODEL_REQUEST_ATTEMPTS,
      requestNumber: params.requestNumber,
      phase: 'sending',
      stream: params.streamingEnabled,
      startedAt,
      updatedAt: startedAt,
      endpoint,
      method: 'POST'
    }
  });

  let streamingMarked = false;
  const markStreaming = () => {
    if (streamingMarked) {
      return;
    }
    streamingMarked = true;
    void updateModelRequest({
      context,
      runId: params.runId,
      chatId: params.chat.id,
      patch: { phase: 'streaming', updatedAt: context.now() }
    });
  };
  const streamCallbacks =
    params.streamingEnabled && params.run.activityStream
      ? createModelRequestStreamCallbacks({ activityStream: params.run.activityStream, onStreamStart: markStreaming })
      : undefined;
  const lifecycle = createModelRequestLifecycle({
    context,
    runId: params.runId,
    chatId: params.chat.id,
    streamingEnabled: params.streamingEnabled
  });

  try {
    const responseMessage = await context.deps.modelClient.chat(
      params.workingMessages,
      params.tools?.length ? params.tools : undefined,
      params.chat.model,
      params.run.abortController.signal,
      streamCallbacks,
      lifecycle,
      {
        reasoningEffort: params.chat.modelSettings.reasoningEffort,
        codexServiceTier: params.chat.modelSettings.codexServiceTier
      }
    );
    await persistSuccessfulModelResponse({ context, params, responseMessage, startedAt });
    return responseMessage;
  } catch (error) {
    await persistFailedModelResponse({ context, params, error, startedAt, endpoint });
    throw error;
  }
}

async function persistSuccessfulModelResponse({
  context,
  params,
  responseMessage,
  startedAt
}: {
  context: AgentRuntimeContext;
  params: Parameters<typeof requestModel>[0]['params'];
  responseMessage: OpenRouterMessage;
  startedAt: number;
}): Promise<void> {
  const finishedAt = context.now();
  await updateModelRequest({
    context,
    runId: params.runId,
    chatId: params.chat.id,
    patch: { phase: 'completed', updatedAt: finishedAt, durationMs: finishedAt - startedAt, retryable: false }
  });
  const callUsage = getCallUsageFromModelUsage(responseMessage.usage, params.model?.pricing);
  const callContext = getChatContextEstimateFromModelUsage(responseMessage.usage, params.model);
  mergeUsage(params.usage, callUsage);
  context.deps.telemetry?.recordModelUsage?.(params.run.telemetry, callUsage);
  if (callUsage) {
    await context.deps.chatRepository.addUsage(params.chat.id, callUsage);
  }
  if (callContext) {
    await context.deps.chatRepository.setContext(params.chat.id, callContext);
  }
  await emit({
    context,
    runId: params.runId,
    event: {
      type: 'model.response',
      runId: params.runId,
      chatId: params.chat.id,
      requestNumber: params.requestNumber,
      message: toRuntimeModelMessage({ message: responseMessage }),
      usage: responseMessage.usage,
      at: finishedAt
    }
  });
}

async function persistFailedModelResponse({
  context,
  params,
  error,
  startedAt,
  endpoint
}: {
  context: AgentRuntimeContext;
  params: Parameters<typeof requestModel>[0]['params'];
  error: unknown;
  startedAt: number;
  endpoint: string;
}): Promise<void> {
  const finishedAt = context.now();
  const info = getModelRequestErrorInfo(error);
  await updateModelRequest({
    context,
    runId: params.runId,
    chatId: params.chat.id,
    patch: {
      phase: params.run.stopRequested ? 'aborted' : 'failed',
      updatedAt: finishedAt,
      durationMs: finishedAt - startedAt,
      endpoint: info?.endpoint || endpoint,
      method: info?.method || 'POST',
      httpStatus: info?.status,
      httpStatusText: info?.statusText,
      error: getModelRequestErrorSummary({ error, info }),
      responseBody: info?.responseBody,
      retryable: isRetryableModelRequestError({ error })
    }
  });
}
