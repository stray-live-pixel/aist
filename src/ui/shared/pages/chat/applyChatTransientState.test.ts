import { describe, expect, it } from 'vitest';

import type { Chat, ChatMessage } from '../../shared/types';
import { applyChatTransientState, clearConfirmedTransientState } from './applyChatTransientState';
import type { ChatTransientState } from './chatTransientState';

describe('applyChatTransientState', () => {
  it('shows a pending user message immediately after submit', () => {
    const chat = createChat({ messages: [] });
    const result = applyChatTransientState({
      chat,
      transient: { submittingChatId: chat.id, submittingPrompt: 'Привет агент' },
      now: 1234
    });

    expect(result.busy).toBe(true);
    expect(result.activity).toBe('thinking');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      id: `local-pending-user:${chat.id}`,
      marker: 'local-pending-user-message',
      role: 'user',
      content: 'Привет агент',
      createdAt: 1234
    });
  });

  it('does not duplicate the pending message when backend already saved the user message', () => {
    const chat = createChat({ messages: [createMessage({ role: 'user', content: 'Привет агент' })] });
    const result = applyChatTransientState({
      chat,
      transient: { submittingChatId: chat.id, submittingPrompt: '  Привет   агент  ' }
    });

    expect(result.messages).toHaveLength(1);
    expect(result.busy).toBe(false);
  });

  it('shows stopping immediately while backend still reports busy', () => {
    const chat = createChat({ busy: true, activity: 'answering' });
    const result = applyChatTransientState({ chat, transient: { stoppingChatId: chat.id } });

    expect(result.busy).toBe(true);
    expect(result.activity).toBe('stopping');
    expect(result.activityDetail).toContain('останов');
  });
});

describe('clearConfirmedTransientState', () => {
  it('clears submit when backend reports busy', () => {
    const chat = createChat({ busy: true });
    const next = clearConfirmedTransientState({
      chat,
      transient: { submittingChatId: chat.id, submittingPrompt: 'prompt' }
    });

    expect(next.submittingChatId).toBeUndefined();
    expect(next.submittingPrompt).toBeUndefined();
  });

  it('clears stopping when backend reports idle', () => {
    const chat = createChat({ busy: false });
    const next = clearConfirmedTransientState({ chat, transient: { stoppingChatId: chat.id } });

    expect(next.stoppingChatId).toBeUndefined();
  });

  it('keeps unrelated transient state for another chat', () => {
    const transient: ChatTransientState = { submittingChatId: 'other-chat', submittingPrompt: 'prompt' };
    const next = clearConfirmedTransientState({ chat: createChat({ id: 'chat-a', busy: true }), transient });

    expect(next).toEqual(transient);
  });
});

function createChat(patch: Partial<Chat> = {}): Chat {
  return {
    id: 'chat-a',
    title: 'Chat A',
    model: 'model-a',
    modelSettings: {
      model: 'model-a',
      reasoningEffort: 'auto',
      codexServiceTier: 'auto',
      maxToolIterations: 0,
      editorContextMode: 'auto',
      streamingEnabled: false,
      toolsDisabled: false
    },
    messages: [],
    lastAnswer: '',
    busy: false,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    createdAt: 1000,
    updatedAt: 1000,
    ...patch
  };
}

function createMessage(patch: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'message-a',
    role: 'user',
    content: 'message',
    createdAt: 1000,
    ...patch
  };
}
