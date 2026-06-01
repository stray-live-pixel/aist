import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';
import { createSidebarSurface } from './getSurfaces';

/**
 * Что это: отправляет текущую sidebar page в sidebar webview.
 * Зачем нужно: команды openChat/openSettings должны переключать страницу без пересоздания webview.
 * Какую продуктовую проблему решает: пользователь мгновенно видит нужную страницу панели AIST.
 */
export function postSidebarPage({
  state,
  callbacks
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
}): void {
  if (!state.sidebarView) {
    return;
  }
  callbacks.postPage(createSidebarSurface({ state, callbacks, webview: state.sidebarView.webview }), state.sidebarPage);
}
