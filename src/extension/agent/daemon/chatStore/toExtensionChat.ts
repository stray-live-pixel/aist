import type { DaemonChat } from '../../../../cli/daemonProtocol';
import type { AgentReflectionCandidate, Chat } from '../../../chats/types';
import { createDefaultModelSettings } from './createDefaultModelSettings';
import { normalizeActivity } from './normalizeActivity';
import { normalizeModelSettings } from './normalizeModelSettings';
import { normalizeUsage } from './normalizeUsage';

/**
 * Что это: переводит daemon chat payload в extension Chat.
 * Зачем нужно: daemon является source of truth, но extension хранит дополнительные локальные поля вроде vcs.
 * Какую проблему решает: webview получает привычную форму Chat без знания daemon protocol деталей.
 */
export function toExtensionChat({ chat, fallbackVcs }: { chat: DaemonChat; fallbackVcs?: Chat['vcs'] }): Chat {
  return {
    id: chat.id,
    title: chat.title,
    model: chat.model,
    modelSettings: normalizeModelSettings({
      value: chat.modelSettings,
      fallback: createDefaultModelSettings({ model: chat.model })
    }),
    previousChatId: chat.previousChatId || undefined,
    compactedAt: chat.compactedAt || undefined,
    compactionModel: chat.compactionModel || undefined,
    vcs: chat.vcs || fallbackVcs,
    messages: chat.messages.map((message) => ({ ...message })),
    history: chat.history as Chat['history'],
    lastAnswer: chat.lastAnswer,
    busy: chat.busy,
    activity: normalizeActivity({ value: chat.activity }),
    activityDetail: chat.activityDetail || undefined,
    modelRequest: (chat.modelRequest as Chat['modelRequest']) || undefined,
    context: (chat.context as Chat['context']) || undefined,
    contextLength: chat.contextLength || undefined,
    activePlan: (chat.activePlan as Chat['activePlan']) || undefined,
    reflectionCandidates: (chat.reflectionCandidates as AgentReflectionCandidate[]) || [],
    usage: normalizeUsage({ value: chat.usage }),
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt
  };
}
