import type { Chat } from '../../../chats/types';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: обязательное чтение чата из локального daemon-store.
 * Зачем нужно: mutation-сценарии должны явно падать, если UI просит несуществующий chat id.
 * Какую продуктовую проблему решает: пользователь получает понятную ошибку вместо тихого игнорирования действия.
 */
export function requireChat({ state, chatId }: { state: DaemonChatStoreState; chatId: string }): Chat {
  const chat = state.chats.get(chatId);
  if (!chat) {
    throw new Error(`Chat not found: ${chatId}`);
  }
  return chat;
}
