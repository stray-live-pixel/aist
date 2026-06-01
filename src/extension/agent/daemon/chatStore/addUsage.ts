import type { ChatUsageEstimate } from '../../../chats/types';
import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: добавляет usage текущего model request к суммарной статистике чата.
 * Зачем нужно: каждый ответ модели приносит новые token/cost значения.
 * Какую продуктовую проблему решает: пользователь видит накопленную стоимость и объём работы агента.
 */
export function addUsage({
  state,
  chatId,
  usage
}: {
  state: DaemonChatStoreState;
  chatId: string;
  usage: Partial<ChatUsageEstimate>;
}): ChatUsageEstimate {
  const chat = requireChat({ state, chatId });
  chat.usage = {
    promptTokens: chat.usage.promptTokens + (usage.promptTokens || 0),
    completionTokens: chat.usage.completionTokens + (usage.completionTokens || 0),
    totalTokens: chat.usage.totalTokens + (usage.totalTokens || 0),
    costUsd:
      chat.usage.costUsd === undefined && usage.costUsd === undefined
        ? undefined
        : (chat.usage.costUsd || 0) + (usage.costUsd || 0)
  };
  touchChat({ state, chat });
  return chat.usage;
}
