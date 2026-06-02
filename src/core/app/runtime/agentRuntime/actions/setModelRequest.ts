import type { ChatModelRequestStatus } from '../../../../shared/types/types';
import type { AgentRuntimeContext } from '../context';
import { emit } from './emit';

/**
 * Что это: записывает новый status model request и отправляет событие.
 * Зачем нужно: UI отображает provider/model/phase текущего запроса модели.
 * Какую продуктовую проблему решает: пользователь понимает, что агент ждёт модель, а не tools/storage.
 */
export async function setModelRequest({
  context,
  runId,
  chatId,
  request
}: {
  context: AgentRuntimeContext;
  runId: string;
  chatId: string;
  request: ChatModelRequestStatus;
}): Promise<void> {
  await context.deps.chatRepository.setModelRequest(chatId, request);
  await emit({
    context,
    runId,
    event: { type: 'model.request.updated', runId, chatId, request, at: context.now() }
  });
}
