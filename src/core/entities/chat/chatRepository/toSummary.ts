import type { Chat, ChatSummary } from '../../../shared/types/types';
import { getChatTitle } from './getChatTitle';
import { getLastMessageAt } from './getLastMessageAt';
import { getLastUserMessage } from './getLastUserMessage';

/**
 * Что это: собирает lightweight-summary из полного чата.
 * Зачем нужно: список чатов не должен отдавать всю историю сообщений.
 * Какую продуктовую проблему решает: webview быстро отображает историю без лишнего payload.
 */
export function toSummary({ chat }: { chat: Chat }): ChatSummary {
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
    lastMessageAt: getLastMessageAt({ chat }),
    updatedAt: chat.updatedAt
  };
}
