import type { AgentControllerState } from './AgentControllerState';

/**
 * Что это: просит sidebar открыть модалку/список чатов.
 * Зачем нужно: команда Open Chats отделена от обычного открытия панели.
 * Какую продуктовую проблему решает: пользователь быстрее переходит к истории диалогов.
 */
export function postShowChats({ state }: { state: AgentControllerState }): void {
  if (!state.sidebarView) {
    return;
  }
  void state.sidebarView.webview.postMessage({ type: 'showChats' }).then(
    (delivered) => state.logger.info('Show chats posted to sidebar webview', { delivered }),
    (error) => state.logger.error('Failed to post show chats to sidebar webview', error)
  );
}
