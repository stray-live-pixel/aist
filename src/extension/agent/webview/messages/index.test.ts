import { describe, expect, it, vi } from 'vitest';

import type { WebviewSurface } from '../../types';
import { handleAgentWebviewMessage } from './index';
import type { AgentWebviewMessageDeps } from './types';

vi.mock('vscode', () => ({}));

/**
 * Что это: regression-тест ready-события временной вкладки нового чата.
 * Зачем нужно: VS Code webview отправляет webviewReady после загрузки HTML и раньше мог получить state старого fallback-чата.
 * Какую продуктовую проблему решает: новый tab сразу показывает создание/пустой чат, а не предыдущую историю пользователя.
 */
describe('handleAgentWebviewMessage webviewReady', () => {
  it('оставляет pending editor на loading и не отправляет state старого чата', async () => {
    const surface = createPendingEditorSurface({
      chatId: 'old-chat',
      message: 'Создаём новый чат...'
    });
    const deps = createDeps();

    await handleAgentWebviewMessage(surface, { type: 'webviewReady' }, deps);

    expect(deps.sendState).not.toHaveBeenCalled();
    expect(surface.webview.postMessage).toHaveBeenCalledWith({
      type: 'loading',
      message: 'Создаём новый чат...'
    });
    expect(deps.postPage).toHaveBeenCalledWith(surface, 'chat');
    expect(deps.refreshCodexAuthState).toHaveBeenCalledTimes(1);
  });
});

/**
 * Что это: собирает временную editor-поверхность до получения нового chatId.
 * Зачем нужно: тесту нужен surface, который имитирует новый tab в момент создания чата.
 * Какую продуктовую проблему решает: сценарий воспроизводит окно, где раньше показывался старый чат.
 */
function createPendingEditorSurface({ chatId, message }: { chatId: string; message: string }): WebviewSurface {
  return {
    id: 'pending-editor',
    kind: 'editor',
    webview: { postMessage: vi.fn().mockResolvedValue(true) } as never,
    getChatId: () => chatId,
    setChatId: vi.fn(),
    isPendingChatCreation: () => true,
    getPendingChatCreationMessage: () => message
  };
}

/**
 * Что это: создаёт минимальные зависимости message-dispatcher для ready-сценария.
 * Зачем нужно: тест проверяет только маршрутизацию pending loading без реального daemon/store.
 * Какую продуктовую проблему решает: регрессия ловится быстро и без запуска полного VS Code окружения.
 */
function createDeps(): AgentWebviewMessageDeps {
  return {
    chats: {} as never,
    logger: { info: vi.fn() } as never,
    secretStore: {} as never,
    getSidebarPage: () => 'chat',
    setSidebarPage: vi.fn(),
    sendState: vi.fn(),
    postPage: vi.fn(),
    refreshModels: vi.fn(),
    refreshCodexAuthState: vi.fn(),
    ask: vi.fn(),
    compactChat: vi.fn(),
    saveReflectionCandidate: vi.fn(),
    rejectReflectionCandidate: vi.fn(),
    openChatInEditor: vi.fn(),
    retargetDeletedChat: vi.fn(),
    loginCodex: vi.fn(),
    logoutCodex: vi.fn(),
    resolveToolCall: vi.fn(),
    syncToolPermissions: vi.fn(),
    openWorkspaceFile: vi.fn(),
    stopCurrentRun: vi.fn(),
    refreshChatVcs: vi.fn(),
    isolateChatVcs: vi.fn(),
    commitAndForcePushChatVcs: vi.fn(),
    mergeChatVcsToMain: vi.fn()
  };
}
