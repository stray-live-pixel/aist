import type { Chat, ChatSummary } from '../../../chats/types';
import { getChatTitle } from './getChatTitle';
import { getLastMessageAt } from './getLastMessageAt';
import { getLastUserMessage } from './getLastUserMessage';

/**
 * Что это: строит краткую карточку чата для списка чатов.
 * Зачем нужно: sidebar показывает summaries без передачи полного массива сообщений.
 * Какую проблему решает: DaemonChatStore не смешивает mutation state и presentation projection.
 */
export function createChatSummary({ chat }: { chat: Chat }): ChatSummary {
  return {
    id: chat.id,
    title: getChatTitle({ chat }),
    model: chat.model,
    modelSettings: chat.modelSettings,
    previousChatId: chat.previousChatId,
    compactedAt: chat.compactedAt,
    compactionModel: chat.compactionModel,
    vcs: chat.vcs,
    messageCount: chat.messages.filter((message) => message.role === 'user' || message.role === 'assistant').length,
    lastUserMessage: getLastUserMessage({ chat }),
    busy: chat.busy,
    activity: chat.activity,
    activityDetail: chat.activityDetail,
    lastMessageAt: getLastMessageAt({ chat }),
    updatedAt: chat.updatedAt
  };
}
