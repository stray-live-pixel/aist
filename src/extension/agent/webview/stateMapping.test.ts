import { describe, expect, it } from 'vitest';

import type { Chat } from '../../chats/types';
import { mapChatToWebviewActiveChat } from './stateMapping';

describe('mapChatToWebviewActiveChat', () => {
  it('keeps the legacy webview chat shape while omitting model history', () => {
    const chat = createChat({
      id: 'chat-active',
      previousChatId: 'chat-previous',
      context: { tokens: 42, maxTokens: 100, percent: 42 },
      usage: undefined
    });
    const previousChat = createChat({ id: 'chat-previous' });

    const mapped = mapChatToWebviewActiveChat({
      chat,
      previousChat,
      systemPrompt: 'System prompt'
    });

    expect(mapped).toMatchObject({
      id: 'chat-active',
      previousChat: { id: 'chat-previous' },
      context: { tokens: 42, maxTokens: 100, percent: 42 },
      contextLength: 42,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    });
    expect(mapped).not.toHaveProperty('history');
    expect(mapped.previousChat).not.toHaveProperty('history');
  });

  it('falls back to a context estimate when the chat has no stored context', () => {
    const mapped = mapChatToWebviewActiveChat({
      chat: createChat({
        history: [{ role: 'user', content: 'Count these tokens for context.' }]
      }),
      systemPrompt: 'System prompt'
    });

    expect(mapped.context.tokens).toBeGreaterThan(0);
    expect(mapped.contextLength).toBe(mapped.context.tokens);
  });
});

function createChat(patch: Partial<Chat> = {}): Chat {
  return {
    id: 'chat',
    title: 'New chat',
    model: 'model-a',
    messages: [{ id: 'message-1', role: 'user', content: 'Hello', createdAt: 1000 }],
    history: [{ role: 'user', content: 'Hello' }],
    lastAnswer: '',
    busy: false,
    usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
    createdAt: 1000,
    updatedAt: 1000,
    ...patch
  };
}
