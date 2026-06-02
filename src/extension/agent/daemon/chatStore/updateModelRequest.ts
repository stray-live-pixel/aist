import type { Chat } from '../../../chats/types';
import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: частично обновляет текущий model request.
 * Зачем нужно: lifecycle события дополняют status без пересоздания уже известных полей.
 * Какую продуктовую проблему решает: прогресс модели обновляется плавно и не теряет предыдущие данные.
 */
export function updateModelRequest({
  state,
  chatId,
  patch
}: {
  state: DaemonChatStoreState;
  chatId: string;
  patch: Partial<NonNullable<Chat['modelRequest']>>;
}): Chat['modelRequest'] | undefined {
  const chat = requireChat({ state, chatId });
  if (!chat.modelRequest) {
    return undefined;
  }

  chat.modelRequest = { ...chat.modelRequest, ...patch };
  touchChat({ state, chat });
  return chat.modelRequest;
}
