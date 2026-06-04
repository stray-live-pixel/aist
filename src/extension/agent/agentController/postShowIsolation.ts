import type { AgentControllerState } from './AgentControllerState';

/**
 * Что это: просит sidebar открыть модалку изолированных агентов.
 * Зачем нужно: системная кнопка VS Code живёт вне React-дерева и должна включать тот же UI, что раньше был в Composer.
 * Какую продуктовую проблему решает: Composer разгружается от второстепенной навигации, но запуск isolated agents остаётся быстрым.
 */
export function postShowIsolation({ state }: { state: AgentControllerState }): void {
  if (!state.sidebarView) {
    return;
  }

  void state.sidebarView.webview.postMessage({ type: 'showIsolation' }).then(
    (delivered) => state.logger.info('Show isolation posted to sidebar webview', { delivered }),
    (error) => state.logger.error('Failed to post show isolation to sidebar webview', error)
  );
}
