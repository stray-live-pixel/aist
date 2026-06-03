import type { AgentRuntimeContext } from '../context';
import { emit } from './emit';

/**
 * Что это: обновляет только detail текущего activity.
 * Зачем нужно: streaming reasoning/content меняет текст прогресса без смены основного этапа.
 * Какую продуктовую проблему решает: UI показывает живой прогресс без сброса состояния run.
 */
export async function setActivityDetail({
  context,
  runId,
  chatId,
  detail
}: {
  context: AgentRuntimeContext;
  runId: string;
  chatId: string;
  detail: string | undefined;
}): Promise<void> {
  const chat = await context.deps.chatRepository.getChat(chatId);
  if (chat?.activityDetail === detail) {
    return;
  }

  await context.deps.chatRepository.setActivityDetail(chatId, detail);
  const activity = chat?.activity || 'thinking';
  await emit({
    context,
    runId,
    event: { type: 'run.activity', runId, chatId, activity, detail, at: context.now() }
  });
}
