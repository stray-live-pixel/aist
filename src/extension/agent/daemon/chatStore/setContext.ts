import type { ChatContextEstimate } from '../../../chats/types';
import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: сохраняет context estimate локального чата.
 * Зачем нужно: UI показывает пользователю текущую заполненность контекста модели.
 * Какую продуктовую проблему решает: пользователь понимает, когда пора compact/clear диалог.
 */
export function setContext({
  state,
  chatId,
  context
}: {
  state: DaemonChatStoreState;
  chatId: string;
  context: ChatContextEstimate | undefined;
}): void {
  const chat = requireChat({ state, chatId });
  chat.context = context;
  chat.contextLength = context?.tokens;
  touchChat({ state, chat });
}
