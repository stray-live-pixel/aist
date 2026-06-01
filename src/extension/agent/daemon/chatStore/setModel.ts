import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: меняет текущую модель чата.
 * Зачем нужно: UI может переключить модель без пересоздания всего чата.
 * Какую продуктовую проблему решает: дальнейшие запросы идут в выбранную пользователем модель.
 */
export function setModel({
  state,
  chatId,
  model
}: {
  state: DaemonChatStoreState;
  chatId: string;
  model: string;
}): void {
  const chat = requireChat({ state, chatId });
  chat.model = model;
  chat.modelSettings = { ...chat.modelSettings, model };
  touchChat({ state, chat });
}
