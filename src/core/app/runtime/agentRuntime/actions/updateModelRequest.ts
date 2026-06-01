import type { ChatModelRequestStatus } from '../../../../shared/types/types';
import type { AgentRuntimeContext } from '../context';
import { emit } from './emit';

/**
 * Что это: патчит status model request и отправляет событие, если request существует.
 * Зачем нужно: lifecycle модели меняет phase, HTTP metadata, duration и retryable без пересоздания объекта.
 * Какую продуктовую проблему решает: UI получает точные переходы request lifecycle.
 */
export async function updateModelRequest({
  context,
  runId,
  chatId,
  patch
}: {
  context: AgentRuntimeContext;
  runId: string;
  chatId: string;
  patch: Partial<ChatModelRequestStatus>;
}): Promise<void> {
  const request = await context.deps.chatRepository.updateModelRequest(chatId, patch);
  if (!request) {
    return;
  }

  await emit({
    context,
    runId,
    event: { type: 'model.request.updated', runId, chatId, request, at: context.now() }
  });
}
