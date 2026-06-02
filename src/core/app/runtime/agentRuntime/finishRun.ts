import type { AgentRun, Chat, ChatUsageEstimate, RuntimeErrorInfo } from '../../../shared/types/types';
import { createRunSnapshot, emit, setActivity } from './actions';
import type { AgentRuntimeContext } from './context';
import type { AgentRuntimeTelemetryStatus } from './types';

/**
 * Что это: завершает run, очищает busy/activity, сохраняет telemetry и отправляет финальное событие.
 * Зачем нужно: success, stopped и error сценарии должны закрывать состояние чата одинаково.
 * Какую продуктовую проблему решает: чат не остаётся вечным busy после любого исхода запуска.
 */
export async function finishRun({
  context,
  chat,
  runId,
  run,
  status,
  answer,
  usage,
  error
}: {
  context: AgentRuntimeContext;
  chat: Chat;
  runId: string;
  run: AgentRun<unknown>;
  status: AgentRuntimeTelemetryStatus;
  answer?: string;
  usage?: ChatUsageEstimate;
  error?: RuntimeErrorInfo;
}): Promise<void> {
  context.deps.telemetry?.finalizeRun?.(run.telemetry, status);
  const telemetrySnapshot = context.deps.telemetry?.snapshot?.(run.telemetry);
  if (telemetrySnapshot !== undefined) {
    await context.deps.runRepository?.setTelemetry?.(runId, telemetrySnapshot);
  }

  await setActivity({ context, runId, chatId: chat.id, activity: undefined });
  await context.deps.chatRepository.setBusy(chat.id, false);
  const snapshotChat = (await context.deps.chatRepository.getChat(chat.id)) || chat;
  if (status === 'success' || status === 'stopped') {
    await emitFinishedRun({ context, chat: snapshotChat, runId, run, status, answer, usage });
  } else if (error) {
    await emit({ context, runId, event: { type: 'run.error', runId, chatId: chat.id, error, at: context.now() } });
  }
  await context.deps.hooks?.onRunFinished?.({ chatId: chat.id, runId, status, usage });
  context.deps.logger.info('Agent run finished', { chatId: chat.id, runId, status });
}

async function emitFinishedRun({
  context,
  chat,
  runId,
  run,
  status,
  answer,
  usage
}: {
  context: AgentRuntimeContext;
  chat: Chat;
  runId: string;
  run: AgentRun<unknown>;
  status: AgentRuntimeTelemetryStatus;
  answer?: string;
  usage?: ChatUsageEstimate;
}): Promise<void> {
  await emit({
    context,
    runId,
    event: {
      type: 'run.finished',
      run: createRunSnapshot({
        context,
        runId,
        chat,
        run,
        status: status === 'success' ? 'completed' : 'stopped',
        usage
      }),
      status: status === 'success' ? 'completed' : 'stopped',
      answer,
      usage,
      reason: status === 'stopped' ? 'Stopped by user.' : undefined,
      at: context.now()
    }
  });
}
