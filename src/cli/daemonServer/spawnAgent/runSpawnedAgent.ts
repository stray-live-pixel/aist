import { contentToText } from '../../../core/entities/model/contentToText';
import { formatError } from '../formatError';
import { createFinalRunMessages } from './createFinalRunMessages';
import type { SpawnAgentRunContext } from './types';

/**
 * Что это: выполняет model call дочернего агента и сохраняет финальный SubagentRun.
 * Зачем нужно: wait/background используют один success/error путь.
 * Какую продуктовую проблему решает: история субагента остаётся доступной пользователю и основной модели в едином формате.
 */
export async function runSpawnedAgent({
  server,
  input,
  runId,
  messages,
  model,
  allowTools,
  startedAt
}: SpawnAgentRunContext): Promise<Record<string, unknown>> {
  try {
    const response = await server.auxiliaryModel.invoke({
      model,
      reasoningEffort: input.reasoningEffort,
      messages,
      tools: allowTools
        ? server.toolRegistry.snapshot().tools.filter((tool) => tool.function.name !== 'spawn_agent')
        : undefined,
      signal: input.signal
    });
    const finishedAt = server.now();
    const content = contentToText({ content: response.content });
    await server.subagentRepository.update(runId, {
      status: 'success',
      history: [...messages, response],
      messages: createFinalRunMessages({
        runId,
        parentChatId: input.parentChatId,
        startedAt,
        finishedAt,
        content,
        status: 'done'
      }),
      result: { ok: true, content },
      finishedAt
    });
    void server.broadcastStateChanged('subagent.spawn.finished', { chatId: input.parentChatId });

    return {
      ok: true,
      mode: input.mode,
      subagentRunId: runId,
      title: input.title || 'Дочерний агент',
      status: 'success',
      model,
      content,
      reasoning: response.reasoning,
      usage: response.usage
    };
  } catch (error) {
    return finishWithError({ server, input, runId, startedAt, error });
  }
}

/**
 * Что это: сохраняет ошибку дочернего агента в SubagentRun.
 * Зачем нужно: фоновые сбои не теряются и не ломают основной tool loop.
 * Какую продуктовую проблему решает: пользователь видит причину сбоя помощника даже после продолжения главного агента.
 */
async function finishWithError({
  server,
  input,
  runId,
  startedAt,
  error
}: Pick<SpawnAgentRunContext, 'server' | 'input' | 'runId' | 'startedAt'> & { error: unknown }): Promise<
  Record<string, unknown>
> {
  const finishedAt = server.now();
  const message = formatError({ error });
  await server.subagentRepository.update(runId, {
    status: 'error',
    messages: createFinalRunMessages({
      runId,
      parentChatId: input.parentChatId,
      startedAt,
      finishedAt,
      content: message,
      status: 'error'
    }),
    result: { ok: false, error: message },
    error: message,
    finishedAt
  });
  void server.broadcastStateChanged('subagent.spawn.failed', { chatId: input.parentChatId });
  return { ok: false, mode: input.mode, subagentRunId: runId, status: 'error', error: message };
}
