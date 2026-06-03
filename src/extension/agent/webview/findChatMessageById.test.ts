import { describe, expect, it } from 'vitest';

import type { Chat } from '../../chats/types';
import { findChatMessageById } from './findChatMessageById';

describe('findChatMessageById', () => {
  it('returns the current backend-backed message by id', () => {
    const chat = createChat();

    expect(findChatMessageById(chat, 'tool-message-1')).toMatchObject({
      id: 'tool-message-1',
      role: 'tool',
      approval: 'pending'
    });
  });

  it('returns undefined for missing message id', () => {
    expect(findChatMessageById(createChat(), 'missing')).toBeUndefined();
  });
});

function createChat(): Chat {
  return {
    id: 'chat-1',
    title: 'Chat',
    model: 'model-a',
    modelSettings: createModelSettings('model-a'),
    messages: [
      { id: 'message-1', role: 'user', content: 'Hello', createdAt: 1000 },
      { id: 'tool-message-1', role: 'tool', name: 'run_bash_script', approval: 'pending', createdAt: 1500 }
    ],
    history: [],
    lastAnswer: '',
    busy: true,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    createdAt: 1000,
    updatedAt: 1500
  };
}

function createModelSettings(model: string) {
  return {
    model,
    reasoningEffort: 'auto' as const,
    codexServiceTier: 'auto' as const,
    maxToolIterations: 0,
    editorContextMode: 'auto' as const,
    streamingEnabled: false,
    toolsDisabled: false
  };
}
