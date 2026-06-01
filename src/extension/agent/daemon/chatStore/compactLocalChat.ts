import { randomUUID } from 'node:crypto';

import type { Chat, ChatMessage } from '../../../chats/types';
import { EMPTY_USAGE } from './constants';
import { requireChat } from './requireChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: создаёт локальную compacted-копию чата с summary и tail.
 * Зачем нужно: webview может показать результат compaction синхронно, пока daemon сохраняет persisted-чат.
 * Какую продуктовую проблему решает: пользователь продолжает диалог в компактном контексте без ожидания полного refresh.
 */
export function compactLocalChat({
  state,
  chatId,
  summary,
  tail = {}
}: {
  state: DaemonChatStoreState;
  chatId: string;
  summary: string;
  tail?: { messages?: ChatMessage[]; history?: Chat['history'] };
}): Chat {
  const source = requireChat({ state, chatId });
  const now = Date.now();
  const chat: Chat = {
    id: randomUUID(),
    title: `${source.title} compacted`,
    model: source.model,
    modelSettings: { ...source.modelSettings },
    previousChatId: source.id,
    compactedAt: now,
    messages: [{ id: randomUUID(), role: 'assistant', content: summary, createdAt: now }, ...(tail.messages || [])],
    history: [{ role: 'assistant', content: summary }, ...(tail.history || [])],
    lastAnswer: summary,
    activity: undefined,
    busy: false,
    usage: { ...EMPTY_USAGE },
    createdAt: now,
    updatedAt: now
  };

  state.chats.set(chat.id, chat);
  state.activeChatId = chat.id;
  state.changedEmitter.fire();
  return chat;
}
