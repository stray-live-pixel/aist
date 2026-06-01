import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';

/**
 * Что это: реагирует на изменение chat store и отправляет полный state, если patch не покрывает изменение.
 * Зачем нужно: daemon events дают chat.patch, а локальные изменения требуют обычного state refresh.
 * Какую продуктовую проблему решает: UI не получает двойную перерисовку на backend update, но не пропускает локальные изменения.
 */
export function handleChatStoreChange({
  state,
  callbacks
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
}): void {
  queueMicrotask(() => {
    if (state.suppressedChatStoreStateBroadcasts > 0) {
      state.suppressedChatStoreStateBroadcasts -= 1;
      state.logger.info('Full state broadcast skipped because chat.patch will cover this backend update');
      return;
    }
    callbacks.sendState();
  });
}
