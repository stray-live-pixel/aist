import type { WebviewSurface } from '../types';

/**
 * Что это: отправляет webview простое loading-состояние без полного AgentState.
 * Зачем нужно: editor вкладка может открыться до создания persisted chat в daemon/FS.
 * Какую продуктовую проблему решает: пользователь сразу видит новую вкладку и понятный статус «чат создаётся».
 */
export function postWebviewLoading({ surface, message }: { surface: WebviewSurface; message: string }): void {
  void surface.webview.postMessage({ type: 'loading', message });
}
