import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';
import { hasPendingChatCreationSurface } from './hasPendingChatCreationSurface';

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
      // Горячий путь backend patch: не логируем каждый пропуск full state,
      // иначе параллельные агенты нагружают OutputChannel и console без пользы для пользователя.
      state.suppressedChatStoreStateBroadcasts -= 1;
      return;
    }
    if (hasPendingChatCreationSurface({ state })) {
      // Во время создания новой вкладки surface ещё держит fallback chatId старого чата.
      // Полный state придёт вручную сразу после привязки реального chatId.
      return;
    }
    callbacks.sendState();
  });
}
