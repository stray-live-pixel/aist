import { describe, expect, it } from 'vitest';

import type { DaemonEvent } from '../../../cli/daemonProtocol';
import type { AgentChatStore } from '../../chats/chatDataStore';
import type { Chat } from '../../chats/types';
import { mapDaemonEventToChatPatch } from './mapDaemonEventToChatPatch';

describe('mapDaemonEventToChatPatch', () => {
  it('maps message.appended to a small webview patch with message and summary', () => {
    const chats = createStore();
    const event: DaemonEvent = {
      type: 'message.appended',
      chatId: 'chat-1',
      message: { id: 'message-2', role: 'assistant', content: 'Done', createdAt: 2000 },
      at: 2000
    };

    const patch = mapDaemonEventToChatPatch(event, chats);

    expect(patch).toMatchObject({
      type: 'chat.patch',
      chatId: 'chat-1',
      message: { id: 'message-2', role: 'assistant' },
      summary: { id: 'chat-1', messageCount: 1 },
      reason: 'message.appended'
    });
    expect(patch?.chat).toMatchObject({ busy: true, activity: 'thinking' });
  });

  it('maps tool approval events with the current backend message payload', () => {
    const chats = createStore({
      activity: 'waitingForApproval',
      messages: [
        { id: 'message-1', role: 'user', content: 'Hello', createdAt: 1000 },
        {
          id: 'tool-message-1',
          role: 'tool',
          name: 'run_bash_script',
          status: 'waiting',
          approval: 'pending',
          createdAt: 1500
        }
      ]
    });
    const event: DaemonEvent = {
      type: 'tool.call.approvalRequested',
      runId: 'run-1',
      chatId: 'chat-1',
      approvalId: 'approval-1',
      messageId: 'tool-message-1',
      approval: {
        approvalId: 'approval-1',
        runId: 'run-1',
        toolCallId: 'tool-call-1',
        toolName: 'run_bash_script',
        args: {},
        previewKind: 'none',
        status: 'pending',
        createdAt: 1500,
        chatId: 'chat-1',
        messageId: 'tool-message-1'
      },
      toolCall: { id: 'tool-call-1', name: 'run_bash_script', args: {} },
      at: 1600
    };

    const patch = mapDaemonEventToChatPatch(event, chats);

    expect(patch?.message).toMatchObject({ id: 'tool-message-1', approval: 'pending' });
    expect(patch?.chat).toMatchObject({ activity: 'waitingForApproval' });
  });

  it('maps model.request.updated to runtime chat fields without message payload', () => {
    const chats = createStore({ modelRequest: createModelRequest() });
    const event: DaemonEvent = {
      type: 'model.request.updated',
      runId: 'run-1',
      chatId: 'chat-1',
      request: createModelRequest(),
      at: 2000
    };

    const patch = mapDaemonEventToChatPatch(event, chats);

    expect(patch?.message).toBeUndefined();
    expect(patch?.chat?.modelRequest).toMatchObject({ model: 'model-a', phase: 'sending' });
  });

  it('ignores events for missing chats', () => {
    const event: DaemonEvent = {
      type: 'run.activity',
      runId: 'run-1',
      chatId: 'missing',
      activity: 'thinking',
      detail: 'Working',
      at: 2000
    };

    expect(mapDaemonEventToChatPatch(event, createStore())).toBeUndefined();
  });
});

function createStore(chatPatch: Partial<Chat> = {}): AgentChatStore {
  const chat: Chat = {
    id: 'chat-1',
    title: 'Chat',
    model: 'model-a',
    modelSettings: createModelSettings('model-a'),
    messages: [{ id: 'message-1', role: 'user', content: 'Hello', createdAt: 1000 }],
    history: [{ role: 'user', content: 'Hello' }],
    lastAnswer: '',
    busy: true,
    activity: 'thinking',
    activityDetail: 'Preparing',
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    createdAt: 1000,
    updatedAt: 1000,
    ...chatPatch
  };

  return {
    onDidChange: (() => ({ dispose: () => undefined })) as AgentChatStore['onDidChange'],
    createChat: () => chat,
    compactChat: () => chat,
    duplicateChat: () => chat,
    deleteChat: () => chat,
    getActiveChat: () => chat,
    getChat: (chatId) => (chatId === chat.id ? chat : undefined),
    setActiveChat: () => chat,
    getSummaries: () => [
      {
        id: chat.id,
        title: chat.title,
        model: chat.model,
        modelSettings: chat.modelSettings,
        messageCount: chat.messages.length,
        lastUserMessage: 'Hello',
        busy: chat.busy,
        activity: chat.activity,
        activityDetail: chat.activityDetail,
        lastMessageAt: 1000,
        updatedAt: chat.updatedAt
      }
    ],
    appendMessage: () => chat.messages[0],
    updateMessage: () => chat.messages[0],
    clearChat: () => undefined,
    setModel: () => undefined,
    setModelSettings: () => undefined,
    setVcsState: () => undefined,
    setBusy: () => undefined,
    setLastAnswer: () => undefined,
    setHistory: () => undefined,
    addUsage: () => chat.usage,
    setContext: () => undefined,
    setActivePlan: () => undefined,
    addReflectionCandidates: () => undefined,
    setReflectionCandidateStatus: () => undefined,
    setActivity: () => undefined,
    setActivityDetail: () => undefined,
    setModelRequest: () => undefined,
    updateModelRequest: () => chat.modelRequest
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

function createModelRequest(): NonNullable<Chat['modelRequest']> {
  return {
    model: 'model-a',
    attempt: 1,
    maxAttempts: 3,
    requestNumber: 1,
    phase: 'sending',
    stream: false,
    startedAt: 1000,
    updatedAt: 1000
  };
}
