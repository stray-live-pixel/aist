import type { AgentRun, Chat, RuntimeRunSnapshot } from '../../../../shared/types/types';
import type { AgentRuntimeContext } from '../context';

/**
 * Что это: формирует snapshot run для события старта/финиша.
 * Зачем нужно: consumers получают полный минимум состояния run в одном payload.
 * Какую продуктовую проблему решает: UI может восстановить карточку run без дополнительных запросов.
 */
export function createRunSnapshot({
  context,
  runId,
  chat,
  run,
  status,
  usage
}: {
  context: AgentRuntimeContext;
  runId: string;
  chat: Chat;
  run: AgentRun<unknown>;
  status: RuntimeRunSnapshot['status'];
  usage?: RuntimeRunSnapshot['usage'];
}): RuntimeRunSnapshot {
  return {
    id: runId,
    chatId: chat.id,
    status,
    prompt: run.prompt,
    startedAt: run.startedAt,
    finishedAt:
      status === 'running' || status === 'waitingForApproval' || status === 'stopping' ? undefined : context.now(),
    activity: chat.activity,
    activityDetail: chat.activityDetail,
    model: chat.model,
    usage
  };
}
