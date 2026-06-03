import { describe, expect, it, vi } from 'vitest';

import type { DaemonEvent } from '../../../cli/daemonProtocol';
import type { Chat } from '../../chats/types';
import type { WebviewSurface } from '../types';
import { handleChatStoreChange } from './handleChatStoreChange';
import { getPatchSurfaces, postChatPatch } from './postChatPatch';
import { reserveChatPatchStateBroadcast } from './reserveChatPatchStateBroadcast';

vi.mock('vscode', () => ({}));

/**
 * Что это: regression-тесты маршрутизации и suppression для chat.patch.
 * Зачем нужно: patchable daemon events должны подавлять ближайший full state до store upsert.
 * Какую продуктовую проблему решает: параллельные агенты не вызывают лишнюю полную перерисовку webview.
 */
describe('chat patch hot path', () => {
  it('suppresses full state before store change and sends patch only to matching surfaces', async () => {
    const sidebar = createSurface({ id: 'sidebar', kind: 'sidebar', chatId: 'chat-1' });
    const activeEditor = createSurface({ id: 'editor-active', kind: 'editor', chatId: 'chat-1' });
    const otherEditor = createSurface({ id: 'editor-other', kind: 'editor', chatId: 'chat-2' });
    const sendState = vi.fn();
    const state = {
      chats: createChatStore({ chat: createChat({ id: 'chat-1', activityDetail: 'Thinking' }) }),
      editorSurfaces: new Map([
        [activeEditor.id, activeEditor],
        [otherEditor.id, otherEditor]
      ]),
      sidebarView: { webview: sidebar.webview },
      suppressedChatStoreStateBroadcasts: 0,
      logger: { error: vi.fn() },
      context: { extension: { packageJSON: { version: 'test' } } },
      daemonRuntime: { workspaceRoot: '/workspace' }
    };
    const callbacks = { ...createCallbacks({ sidebar }), sendState };
    const event: DaemonEvent = {
      type: 'run.activity',
      runId: 'run-1',
      chatId: 'chat-1',
      activity: 'thinking',
      detail: 'Thinking',
      at: 1000
    };

    reserveChatPatchStateBroadcast({ state: state as never, event });
    expect(state.suppressedChatStoreStateBroadcasts).toBe(1);

    handleChatStoreChange({ state: state as never, callbacks: callbacks as never });
    await flushMicrotasks();

    expect(sendState).not.toHaveBeenCalled();
    expect(state.suppressedChatStoreStateBroadcasts).toBe(0);

    postChatPatch({ state: state as never, callbacks: callbacks as never, event });
    await flushMicrotasks();

    expect(sidebar.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'chat.patch', chatId: 'chat-1' })
    );
    expect(activeEditor.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'chat.patch', chatId: 'chat-1' })
    );
    expect(otherEditor.webview.postMessage).not.toHaveBeenCalled();
  });

  it('does not suppress full state for events without chat patch', async () => {
    const sidebar = createSurface({ id: 'sidebar', kind: 'sidebar', chatId: 'chat-1' });
    const sendState = vi.fn();
    const state = {
      chats: createChatStore({ chat: createChat({ id: 'chat-1' }) }),
      editorSurfaces: new Map(),
      sidebarView: { webview: sidebar.webview },
      suppressedChatStoreStateBroadcasts: 0,
      logger: { error: vi.fn() },
      context: { extension: { packageJSON: { version: 'test' } } },
      daemonRuntime: { workspaceRoot: '/workspace' }
    };
    const callbacks = { ...createCallbacks({ sidebar }), sendState };
    const event: DaemonEvent = {
      type: 'state.changed',
      workspaceRoot: '/workspace',
      reason: 'config.update',
      activeRun: null,
      activeRuns: [],
      at: 1000
    };

    reserveChatPatchStateBroadcast({ state: state as never, event });
    handleChatStoreChange({ state: state as never, callbacks: callbacks as never });
    await flushMicrotasks();

    expect(sendState).toHaveBeenCalledTimes(1);
    expect(state.suppressedChatStoreStateBroadcasts).toBe(0);
  });

  it('keeps sidebar global but sends editor patches only to matching chat', () => {
    const sidebar = createSurface({ id: 'sidebar', kind: 'sidebar', chatId: 'chat-1' });
    const activeEditor = createSurface({ id: 'editor-active', kind: 'editor', chatId: 'chat-1' });
    const otherEditor = createSurface({ id: 'editor-other', kind: 'editor', chatId: 'chat-2' });
    const state = {
      editorSurfaces: new Map([
        [activeEditor.id, activeEditor],
        [otherEditor.id, otherEditor]
      ]),
      sidebarView: { webview: sidebar.webview }
    };
    const callbacks = createCallbacks({ sidebar });

    const surfaces = getPatchSurfaces({
      state: state as never,
      callbacks: callbacks as never,
      chatId: 'chat-1'
    });

    expect(surfaces.map((surface) => surface.id)).toEqual(['editor-active', 'sidebar']);
  });
});

function createSurface({
  id,
  kind,
  chatId
}: {
  id: string;
  kind: WebviewSurface['kind'];
  chatId: string;
}): WebviewSurface {
  let currentChatId = chatId;

  return {
    id,
    kind,
    webview: { postMessage: vi.fn(() => Promise.resolve(true)) } as never,
    getChatId: () => currentChatId,
    setChatId: (nextChatId) => {
      currentChatId = nextChatId;
    }
  };
}

function createCallbacks({ sidebar }: { sidebar: WebviewSurface }) {
  return {
    getSidebarChatId: sidebar.getChatId,
    setSidebarChatId: sidebar.setChatId
  };
}

function createChatStore({ chat }: { chat: Chat }) {
  return {
    getChat: (chatId: string) => (chatId === chat.id ? chat : undefined),
    getSummaries: () => [createSummary({ chat })]
  };
}

function createChat({ id, activityDetail }: { id: string; activityDetail?: string }): Chat {
  return {
    id,
    title: 'Chat',
    model: 'model',
    modelSettings: {
      model: 'model',
      reasoningEffort: 'auto',
      codexServiceTier: 'auto',
      maxToolIterations: 0,
      editorContextMode: 'auto',
      streamingEnabled: false,
      toolsDisabled: false
    },
    messages: [],
    history: [],
    lastAnswer: '',
    busy: true,
    activity: 'thinking',
    activityDetail,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    createdAt: 1000,
    updatedAt: 1000
  };
}

function createSummary({ chat }: { chat: Chat }) {
  return {
    id: chat.id,
    title: chat.title,
    model: chat.model,
    modelSettings: chat.modelSettings,
    messageCount: chat.messages.length,
    lastUserMessage: '',
    busy: chat.busy,
    activity: chat.activity,
    activityDetail: chat.activityDetail,
    lastMessageAt: chat.updatedAt,
    updatedAt: chat.updatedAt
  };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
