import type { Chat, ChatModelRequestStatus } from '../../../shared/types/types';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { requireChat } from './requireChat';
import { updateChatState } from './updateChatState';

/**
 * Что это: частичное обновление текущего model request.
 * Зачем нужно: streaming/runtime дописывает статус запроса без пересоздания всего state.
 * Какую продуктовую проблему решает: UI показывает актуальный прогресс модели и не теряет уже известные поля.
 */
export async function updateChatModelRequest({
  context,
  chatId,
  patch
}: {
  context: ChatRepositoryContext;
  chatId: string;
  patch: Partial<NonNullable<Chat['modelRequest']>>;
}): Promise<ChatModelRequestStatus | undefined> {
  const chat = await requireChat({ context, chatId });
  if (!chat.modelRequest) {
    return undefined;
  }

  const nextRequest = { ...chat.modelRequest, ...patch };
  await updateChatState({ context, chatId, patch: { modelRequest: nextRequest } });
  return nextRequest;
}
