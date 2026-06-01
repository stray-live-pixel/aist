import type { Chat } from '../../../chats/types';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: сортирует локальные чаты по updatedAt.
 * Зачем нужно: active fallback и summaries должны выбирать один и тот же свежий чат.
 * Какую продуктовую проблему решает: список и активный чат не расходятся после refresh daemon-состояния.
 */
export function getSortedChats({ state }: { state: DaemonChatStoreState }): Chat[] {
  return [...state.chats.values()].sort((left, right) => right.updatedAt - left.updatedAt);
}
