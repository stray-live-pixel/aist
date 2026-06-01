import type { ChatSummary } from '../../../chats/types';
import { createChatSummary } from './createChatSummary';
import { getSortedChats } from './getSortedChats';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: строит список summaries из локальных чатов.
 * Зачем нужно: webview sidebar не должен получать полные messages/history каждого чата.
 * Какую продуктовую проблему решает: список чатов остаётся быстрым и компактным при больших диалогах.
 */
export function getChatSummaries({ state }: { state: DaemonChatStoreState }): ChatSummary[] {
  return getSortedChats({ state }).map((chat) => createChatSummary({ chat }));
}
