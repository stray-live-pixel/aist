import { type Chat, type JsonValue } from '../../core/shared/types/types';
import { ChatJson } from './ChatJson';

export function toChatJson(chat: Chat): ChatJson {
  return {
    id: chat.id,
    title: chat.title,
    model: chat.model,
    previousChatId: chat.previousChatId ?? null,
    compactedAt: chat.compactedAt ?? null,
    compactionModel: chat.compactionModel ?? null,
    messages: chat.messages,
    history: chat.history as JsonValue[],
    lastAnswer: chat.lastAnswer,
    busy: chat.busy,
    activity: chat.activity ?? null,
    activityDetail: chat.activityDetail ?? null,
    modelRequest: (chat.modelRequest as JsonValue | undefined) ?? null,
    context: (chat.context as JsonValue | undefined) ?? null,
    contextLength: chat.contextLength ?? null,
    activePlan: (chat.activePlan as JsonValue | undefined) ?? null,
    reflectionCandidates: (chat.reflectionCandidates as JsonValue[] | undefined) ?? [],
    usage: chat.usage,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt
  };
}
