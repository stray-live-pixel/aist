import type { ChatModelSettings } from '../../../chats/types';
import { normalizeModelSettings } from './normalizeModelSettings';
import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: обновляет настройки модели активного чата.
 * Зачем нужно: reasoning, context mode и streaming меняются независимо от messages.
 * Какую продуктовую проблему решает: UI хранит полный валидный набор model settings после частичного patch.
 */
export function setModelSettings({
  state,
  chatId,
  settings
}: {
  state: DaemonChatStoreState;
  chatId: string;
  settings: Partial<ChatModelSettings>;
}): void {
  const chat = requireChat({ state, chatId });
  chat.modelSettings = normalizeModelSettings({
    value: { ...chat.modelSettings, ...settings },
    fallback: chat.modelSettings
  });
  chat.model = chat.modelSettings.model;
  touchChat({ state, chat });
}
