import type { ModelProvider } from '../../../core/shared/types/types';
import type { WebviewMessage, WebviewSurface } from '../types';
import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';

/**
 * Что это: зависимости host layer для sidebar/editor webviews.
 * Зачем нужно: host.ts получает стабильный набор callbacks без доступа к классу AgentController.
 * Какую продуктовую проблему решает: webview lifecycle и message routing остаются независимыми от внутренней структуры контроллера.
 */
export function getWebviewHostDeps({
  state,
  callbacks
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
}) {
  return {
    context: state.context,
    chats: state.chats,
    logger: state.logger,
    getSidebarChatId: () => state.sidebarChatId,
    setSidebarChatId: (chatId: string) => {
      state.sidebarChatId = chatId;
    },
    setSidebarView: (view: import('vscode').WebviewView | undefined) => {
      state.sidebarView = view;
    },
    registerEditorSurface: (surfaceId: string, surface: WebviewSurface) => {
      state.editorSurfaces.set(surfaceId, surface);
    },
    unregisterEditorSurface: (surfaceId: string) => {
      state.editorSurfaces.delete(surfaceId);
    },
    handleMessage: (surface: WebviewSurface, message: WebviewMessage) =>
      callbacks.handleWebviewMessage(surface, message),
    sendState: (surface: WebviewSurface) => callbacks.sendState(surface),
    postPage: (surface: WebviewSurface, page: 'chat' | 'settings') => callbacks.postPage(surface, page),
    refreshModels: (provider?: ModelProvider) => callbacks.refreshModels(true, provider || 'all')
  };
}
