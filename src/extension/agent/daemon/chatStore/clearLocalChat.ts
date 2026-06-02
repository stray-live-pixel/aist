import { EMPTY_USAGE } from './constants';
import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: очищает локальный чат до состояния нового диалога.
 * Зачем нужно: clear должен убрать messages/history/runtime-status одним сценарным действием.
 * Какую продуктовую проблему решает: старый tool/status/context не протекает в новый разговор пользователя.
 */
export function clearLocalChat({ state, chatId }: { state: DaemonChatStoreState; chatId: string }): void {
  const chat = requireChat({ state, chatId });
  chat.title = 'New chat';
  chat.messages = [];
  chat.history = [];
  chat.lastAnswer = '';
  chat.activity = undefined;
  chat.activityDetail = undefined;
  chat.modelRequest = undefined;
  chat.busy = false;
  chat.context = undefined;
  chat.contextLength = undefined;
  chat.activePlan = undefined;
  chat.reflectionCandidates = [];
  chat.usage = { ...EMPTY_USAGE };
  touchChat({ state, chat });
}
