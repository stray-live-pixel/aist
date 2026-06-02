import type { Chat, JsonValue } from '../../core/shared/types/types';
import type { DaemonChat } from '../daemonProtocol';

/**
 * Что это: преобразует core Chat entity в daemon protocol DTO.
 * Зачем нужно: JSON-RPC protocol использует null для отсутствующих optional полей и JSON-safe values.
 * Какую продуктовую проблему решает: webview/CLI получают стабильный формат чата независимо от storage модели.
 */
export function toDaemonChat({ chat }: { chat: Chat }): DaemonChat {
  return {
    id: chat.id,
    title: chat.title,
    model: chat.model,
    modelSettings: chat.modelSettings,
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
    usage: chat.usage as JsonValue,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt
  };
}
