import type * as vscode from 'vscode';

import type { WebviewSurface } from '../types';
import { createSidebar } from '../webview/host';
import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';
import { getWebviewHostDeps } from './getWebviewHostDeps';

/**
 * Что это: собирает все активные webview surfaces контроллера.
 * Зачем нужно: state, patch и error-modal должны уходить и в sidebar, и в editor panels.
 * Какую продуктовую проблему решает: пользователь видит одинаковое состояние агента на всех открытых поверхностях.
 */
export function getSurfaces({
  state,
  callbacks
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
}): WebviewSurface[] {
  const surfaces: WebviewSurface[] = [...state.editorSurfaces.values()];
  if (state.sidebarView) {
    surfaces.push(createSidebarSurface({ state, callbacks, webview: state.sidebarView.webview }));
  }
  return surfaces;
}

/**
 * Что это: создаёт surface-адаптер sidebar webview.
 * Зачем нужно: sidebar каждый раз строится из актуальных host deps и sidebar chat id.
 * Какую продуктовую проблему решает: sidebar не теряет callbacks после reconnect/reload.
 */
export function createSidebarSurface({
  state,
  callbacks,
  webview
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  webview: vscode.Webview;
}): WebviewSurface {
  return createSidebar(getWebviewHostDeps({ state, callbacks }), webview);
}
