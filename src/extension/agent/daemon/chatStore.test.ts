import { describe, expect, it, vi } from 'vitest';

import type { DaemonChat } from '../../../cli/daemonProtocol';
import { DaemonChatStore } from './chatStore';

vi.mock('vscode', () => {
  class EventEmitter<T> {
    private listeners: Array<(event: T) => void> = [];
    event = (listener: (event: T) => void) => {
      this.listeners.push(listener);
      return { dispose: () => undefined };
    };
    fire(event: T): void {
      for (const listener of this.listeners) {
        listener(event);
      }
    }
  }

  return { EventEmitter };
});

describe('DaemonChatStore', () => {
  it('maps daemon chats into the synchronous webview chat store shape', () => {
    const store = new DaemonChatStore();
    const chat = createDaemonChat({
      id: 'chat-1',
      previousChatId: null,
      compactedAt: null,
      activity: 'waitingForApproval',
      activityDetail: 'Waiting',
      contextLength: 42
    });

    store.replaceAll([chat], 'chat-1');

    const activeChat = store.getActiveChat();
    expect(activeChat).toMatchObject({
      id: 'chat-1',
      previousChatId: undefined,
      compactedAt: undefined,
      activity: 'waitingForApproval',
      activityDetail: 'Waiting',
      contextLength: 42
    });
    expect(activeChat.messages[0]).toMatchObject({ role: 'user', content: 'Hello' });
    expect(store.getSummaries()).toEqual([
      expect.objectContaining({
        id: 'chat-1',
        messageCount: 1,
        lastUserMessage: 'Hello',
        busy: false
      })
    ]);
  });

  it('keeps local approval preview patches until daemon state refreshes', () => {
    const store = new DaemonChatStore();
    store.replaceAll([createDaemonChat({ id: 'chat-1' })], 'chat-1');

    store.updateMessage('chat-1', 'tool-1', {
      result: {
        preview: {
          ok: true,
          editable: true
        }
      }
    });

    expect(store.getChat('chat-1')?.messages.find((message) => message.id === 'tool-1')).toMatchObject({
      result: {
        preview: {
          editable: true
        }
      }
    });
  });
});

function createDaemonChat(patch: Partial<DaemonChat>): DaemonChat {
  return {
    id: 'chat-1',
    title: 'New chat',
    model: 'fake-model',
    modelSettings: createModelSettings('fake-model'),
    previousChatId: null,
    compactedAt: null,
    compactionModel: null,
    messages: [
      { id: 'message-1', role: 'user', content: 'Hello', createdAt: 1 },
      {
        id: 'tool-1',
        role: 'tool',
        name: 'write_file',
        status: 'waiting',
        approval: 'pending',
        args: {},
        createdAt: 2
      }
    ],
    history: [],
    lastAnswer: '',
    busy: false,
    activity: null,
    activityDetail: null,
    modelRequest: null,
    context: null,
    contextLength: null,
    activePlan: null,
    reflectionCandidates: [],
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    },
    createdAt: 1,
    updatedAt: 2,
    ...patch
  };
}

function createModelSettings(model: string) {
  return {
    model,
    reasoningEffort: 'auto' as const,
    codexServiceTier: 'auto' as const,
    maxToolIterations: 0,
    editorContextMode: 'auto' as const,
    streamingEnabled: false
  };
}
