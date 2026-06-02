import { randomUUID } from 'node:crypto';

import type { Chat, ChatModelSettings } from '../../../chats/types';
import { DEFAULT_MODEL } from '../../../shared/constants';
import { EMPTY_USAGE } from './constants';
import { normalizeInitialModelSettings } from './normalizeInitialModelSettings';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: создаёт локальный новый чат до подтверждения daemon.
 * Зачем нужно: extension API остаётся синхронным для webview-компонентов.
 * Какую продуктовую проблему решает: пользователь мгновенно видит новый диалог при нажатии New chat.
 */
export function createLocalChat({
  state,
  settings = DEFAULT_MODEL
}: {
  state: DaemonChatStoreState;
  settings?: string | ChatModelSettings;
}): Chat {
  const modelSettings = normalizeInitialModelSettings({ settings });
  const now = Date.now();
  const chat: Chat = {
    id: randomUUID(),
    title: 'New chat',
    model: modelSettings.model,
    modelSettings,
    messages: [],
    history: [],
    lastAnswer: '',
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
