import type { Chat } from '../../../chats/types';
import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: выбирает активный чат в локальном store.
 * Зачем нужно: список чатов и экран сообщений должны синхронно реагировать на выбор пользователя.
 * Какую продуктовую проблему решает: выбранный чат поднимается как актуальный и не теряется при refresh.
 */
export function setActiveLocalChat({ state, chatId }: { state: DaemonChatStoreState; chatId: string }): Chat {
  const chat = requireChat({ state, chatId });
  state.activeChatId = chat.id;
  touchChat({ state, chat });
  return chat;
}
