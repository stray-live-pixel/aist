import { readJsonlFile } from '../../../shared/lib/fileRepository';
import type { Chat, ChatMessage, OpenRouterMessage } from '../../../shared/types/types';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import type { StoredChatMeta } from './StoredChatMeta';
import { getChatHistoryPath } from './getChatHistoryPath';
import { getChatMessagesPath } from './getChatMessagesPath';
import { normalizeMeta } from './normalizeMeta';
import { normalizeModelSettings } from './normalizeModelSettings';
import { readChatState } from './readChatState';

/**
 * Что это: сборка полного доменного чата из meta/messages/history/state.
 * Зачем нужно: storage хранит данные по файлам, а runtime работает с единым объектом Chat.
 * Какую продуктовую проблему решает: UI и агент получают консистентный снимок чата после любого restart.
 */
export async function readChatFromMeta({
  context,
  meta
}: {
  context: ChatRepositoryContext;
  meta: StoredChatMeta;
}): Promise<Chat> {
  const normalizedMeta = normalizeMeta({ meta });
  const messages = await readJsonlFile<ChatMessage>(getChatMessagesPath({ context, chatId: normalizedMeta.id }));
  const history = await readJsonlFile<OpenRouterMessage>(getChatHistoryPath({ context, chatId: normalizedMeta.id }));
  const state = await readChatState({ context, chatId: normalizedMeta.id });

  return {
    id: normalizedMeta.id,
    title: normalizedMeta.title,
    model: normalizedMeta.model,
    modelSettings:
      normalizedMeta.modelSettings || normalizeModelSettings({ value: undefined, fallbackModel: normalizedMeta.model }),
    previousChatId: normalizedMeta.previousChatId,
    compactedAt: normalizedMeta.compactedAt,
    compactionModel: normalizedMeta.compactionModel,
    vcs: normalizedMeta.vcs,
    messages,
    history,
    lastAnswer: normalizedMeta.lastAnswer,
    busy: state.busy,
    activity: state.activity,
    activityDetail: state.activityDetail,
    modelRequest: state.modelRequest,
    context: state.context,
    contextLength: state.contextLength,
    activePlan: state.activePlan,
    reflectionCandidates: state.reflectionCandidates,
    usage: normalizedMeta.usage,
    createdAt: normalizedMeta.createdAt,
    updatedAt: normalizedMeta.updatedAt
  };
}
