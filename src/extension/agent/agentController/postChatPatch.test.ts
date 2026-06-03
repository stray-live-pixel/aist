import { describe, expect, it, vi } from 'vitest';

import type { WebviewSurface } from '../types';
import { getPatchSurfaces } from './postChatPatch';

vi.mock('vscode', () => ({}));

/**
 * Что это: regression-тест маршрутизации chat.patch.
 * Зачем нужно: editor-панель должна обновляться только от своего чата,
 * иначе параллельные агенты умножают IPC и React-рендеры друг друга.
 */
describe('getPatchSurfaces', () => {
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
    webview: { postMessage: vi.fn() } as never,
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
