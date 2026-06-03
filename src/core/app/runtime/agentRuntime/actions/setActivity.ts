import type { Chat } from '../../../../shared/types/types';
import type { AgentRuntimeContext } from '../context';
import { emit } from './emit';

/**
 * Что это: обновляет общий activity статус run и отправляет событие в UI.
 * Зачем нужно: пользователь видит текущий этап агента во время подготовки, model request и tools.
 * Какую продуктовую проблему решает: долгий запуск не выглядит зависшим.
 */
export async function setActivity({
  context,
  runId,
  chatId,
  activity,
  detail
}: {
  context: AgentRuntimeContext;
  runId: string;
  chatId: string;
  activity: Chat['activity'];
  detail?: string;
}): Promise<void> {
  const currentChat = await context.deps.chatRepository.getChat(chatId);
  if (currentChat && currentChat.activity === activity && currentChat.activityDetail === detail) {
    return;
  }

  await context.deps.chatRepository.setActivity(chatId, activity, detail);
  if (activity) {
    await emit({
      context,
      runId,
      event: { type: 'run.activity', runId, chatId, activity, detail, at: context.now() }
    });
  }
}
