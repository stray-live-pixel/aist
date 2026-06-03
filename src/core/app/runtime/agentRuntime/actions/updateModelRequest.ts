import type { ChatModelRequestStatus } from '../../../../shared/types/types';
import type { AgentRuntimeContext } from '../context';
import { emit } from './emit';

/**
 * Что это: патчит status model request и отправляет событие, если request существует.
 * Зачем нужно: lifecycle модели меняет phase, HTTP metadata, duration и retryable без пересоздания объекта.
 * Какую продуктовую проблему решает: UI получает точные переходы request lifecycle без no-op событий и лишних записей.
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
  const currentChat = await context.deps.chatRepository.getChat(chatId);
  if (!currentChat?.modelRequest || isModelRequestPatchNoop({ request: currentChat.modelRequest, patch })) {
    return;
  }

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

/**
 * Что это: проверяет, меняет ли patch фактические поля model request.
 * Зачем нужно: retry/streaming может повторно прислать те же значения, и такие no-op не должны писать state.
 * Какую продуктовую проблему решает: progress модели не создаёт лишние daemon events и refresh webview.
 */
function isModelRequestPatchNoop({
  request,
  patch
}: {
  request: ChatModelRequestStatus;
  patch: Partial<ChatModelRequestStatus>;
}): boolean {
  return Object.entries(patch).every(([key, value]) => request[key as keyof ChatModelRequestStatus] === value);
}
