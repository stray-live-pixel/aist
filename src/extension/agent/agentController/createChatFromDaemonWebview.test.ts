import { describe, expect, it, vi } from 'vitest';

import type { Chat, ChatModelSettings } from '../../chats/types';
import type { WebviewSurface } from '../types';
import { createChatFromDaemonWebview } from './createChatFromDaemonWebview';

vi.mock('vscode', () => ({}));
vi.mock('../config/settingsSnapshot', () => ({
  getDefaultModelSettings: () => ({
    model: 'openai/gpt-4o-mini',
    reasoningEffort: 'auto',
    codexServiceTier: 'auto',
    maxToolIterations: 0,
    editorContextMode: 'auto',
    streamingEnabled: false
  })
}));

/**
 * Что это: regression-тест создания нового чата из webview.
 * Зачем нужно: кнопка «Новый чат» раньше успевала отправить state старого диалога до реального chatId.
 * Какую продуктовую проблему решает: пользователь видит loading и затем пустой новый чат без мигания предыдущей истории.
 */
describe('createChatFromDaemonWebview', () => {
  it('отправляет state только после привязки surface к созданному чату', async () => {
    const oldChat = createChat({ id: 'old-chat', title: 'Старый чат' });
    const newChat = createChat({ id: 'new-chat', title: 'Новый чат' });
    const surface = createSurface({ chatId: oldChat.id });
    const sendState = vi.fn((targetSurface?: WebviewSurface) => {
      expect(targetSurface?.getChatId() || surface.getChatId()).toBe(newChat.id);
    });

    await createChatFromDaemonWebview({
      state: {
        chats: createChatStore({ oldChat, newChat }),
        daemonRuntime: { createChat: vi.fn().mockResolvedValue(newChat) },
        logger: { info: vi.fn() },
        sidebarPage: 'settings',
        suppressedChatStoreStateBroadcasts: 0
      } as never,
      callbacks: { sendState, postPage: vi.fn() } as never,
      surface,
      loadingMessage: 'Чат создаётся...'
    });

    expect(surface.webview.postMessage).toHaveBeenCalledWith({ type: 'loading', message: 'Чат создаётся...' });
    expect(surface.getChatId()).toBe(newChat.id);
    expect(sendState).toHaveBeenCalledTimes(1);
  });
});

function createSurface({ chatId }: { chatId: string }): WebviewSurface {
  let currentChatId = chatId;

  return {
    id: 'sidebar',
    kind: 'sidebar',
    webview: { postMessage: vi.fn().mockResolvedValue(true) } as never,
    getChatId: () => currentChatId,
    setChatId: (nextChatId) => {
      currentChatId = nextChatId;
    }
  };
}

function createChatStore({ oldChat, newChat }: { oldChat: Chat; newChat: Chat }) {
  return {
    getChat: (chatId: string) => (chatId === newChat.id ? newChat : chatId === oldChat.id ? oldChat : undefined),
    getActiveChat: () => newChat,
    getSummaries: () =>
      [oldChat, newChat].map((chat) => ({
        id: chat.id,
        title: chat.title,
        model: chat.model,
        modelSettings: chat.modelSettings,
        messageCount: chat.messages.length,
        lastUserMessage: '',
        busy: chat.busy,
        lastMessageAt: chat.updatedAt,
        updatedAt: chat.updatedAt
      }))
  };
}

function createChat({ id, title }: { id: string; title: string }): Chat {
  const modelSettings = createModelSettings();

  return {
    id,
    title,
    model: modelSettings.model,
    modelSettings,
    messages: [],
    history: [],
    lastAnswer: '',
    busy: false,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    createdAt: 1,
    updatedAt: 1
  };
}

function createModelSettings(): ChatModelSettings {
  return {
    model: 'openai/gpt-4o-mini',
    reasoningEffort: 'auto',
    codexServiceTier: 'auto',
    maxToolIterations: 0,
    editorContextMode: 'auto',
    streamingEnabled: false
  };
}
