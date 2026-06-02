import { randomUUID } from 'node:crypto';

import type { Chat } from '../../../chats/types';
import { cloneChat } from './cloneChat';
import { requireChat } from './requireChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: создаёт локальную копию существующего чата.
 * Зачем нужно: пользователь может продолжить альтернативную ветку без изменения исходного диалога.
 * Какую продуктовую проблему решает: copy-сценарий не разделяет mutable arrays/messages с оригиналом.
 */
export function duplicateLocalChat({ state, chatId }: { state: DaemonChatStoreState; chatId: string }): Chat {
  const source = requireChat({ state, chatId });
  const now = Date.now();
  const chat: Chat = {
    ...cloneChat({ chat: source }),
    id: randomUUID(),
    title: `${source.title} copy`,
    busy: false,
    activity: undefined,
    activityDetail: undefined,
    modelRequest: undefined,
    createdAt: now,
    updatedAt: now
  };

  state.chats.set(chat.id, chat);
  state.activeChatId = chat.id;
  state.changedEmitter.fire();
  return chat;
}
