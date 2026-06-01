import type { ChatUsageEstimate } from '../../../shared/types/types';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { normalizeUsage } from './normalizeUsage';
import { requireChat } from './requireChat';
import { updateChatMetadata } from './updateChatMetadata';

/**
 * Что это: накопительное добавление usage к чату.
 * Зачем нужно: каждый model request сообщает частичные токены/стоимость.
 * Какую продуктовую проблему решает: пользователь видит суммарную стоимость и объём контекста по всему диалогу.
 */
export async function addChatUsage({
  context,
  chatId,
  usage
}: {
  context: ChatRepositoryContext;
  chatId: string;
  usage: Partial<ChatUsageEstimate>;
}): Promise<ChatUsageEstimate> {
  const chat = await requireChat({ context, chatId });
  const currentCost = chat.usage.costUsd;
  const nextCost =
    currentCost === undefined && usage.costUsd === undefined ? undefined : (currentCost || 0) + (usage.costUsd || 0);
  const nextUsage = normalizeUsage({
    usage: {
      promptTokens: chat.usage.promptTokens + (usage.promptTokens || 0),
      completionTokens: chat.usage.completionTokens + (usage.completionTokens || 0),
      totalTokens: chat.usage.totalTokens + (usage.totalTokens || 0),
      costUsd: nextCost
    }
  });

  await updateChatMetadata({ context, chatId, patch: { usage: nextUsage } });
  return nextUsage;
}
