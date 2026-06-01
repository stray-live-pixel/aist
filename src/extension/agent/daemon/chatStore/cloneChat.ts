import type { Chat } from '../../../chats/types';

/**
 * Что это: создаёт независимую копию chat object для локального duplicate.
 * Зачем нужно: копия не должна разделять messages/history/settings с исходным чатом.
 * Какую проблему решает: изменения duplicate-чата не меняют исходный чат через общие ссылки.
 */
export function cloneChat({ chat }: { chat: Chat }): Chat {
  return {
    ...chat,
    messages: chat.messages.map((message) => ({ ...message })),
    history: chat.history.map((message) => ({ ...message })),
    modelSettings: { ...chat.modelSettings },
    usage: { ...chat.usage },
    activePlan: chat.activePlan ? JSON.parse(JSON.stringify(chat.activePlan)) : undefined,
    reflectionCandidates: chat.reflectionCandidates
      ? chat.reflectionCandidates.map((candidate) => ({ ...candidate }))
      : undefined
  };
}
