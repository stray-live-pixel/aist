import type { OpenRouterModelOption } from '../../../core/types';
import type { Chat } from '../../chats/types';
import { createEmptyUsage, getChatContextEstimate } from '../runtime/usage';

export type WebviewActiveChat = Omit<Chat, 'history'> & {
  previousChat?: Omit<Chat, 'history'>;
  context: NonNullable<Chat['context']>;
  contextLength: number;
  usage: NonNullable<Chat['usage']>;
};

export function omitHistory<T extends { history?: unknown }>(chat: T): Omit<T, 'history'> {
  const { history: _history, ...rest } = chat;
  return rest;
}

export function mapChatToWebviewActiveChat(input: {
  chat: Chat;
  previousChat?: Chat;
  systemPrompt: string;
  activeModel?: OpenRouterModelOption;
}): WebviewActiveChat {
  const chatContext =
    input.chat.context ||
    getChatContextEstimate(input.chat.history, input.systemPrompt, input.activeModel, input.chat.usage);
  const { history: _history, ...webviewChat } = input.chat;

  return {
    ...webviewChat,
    previousChat: input.previousChat ? omitHistory(input.previousChat) : undefined,
    context: chatContext,
    contextLength: chatContext.tokens || 0,
    usage: input.chat.usage || createEmptyUsage()
  };
}
