import type { DaemonEvent } from '../../../cli/daemonProtocol';
import { mapDaemonEventToChatPatch } from '../webview/mapDaemonEventToChatPatch';
import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';
import { getSurfaces } from './getSurfaces';

/**
 * Что это: отправляет incremental chat.patch по daemon event.
 * Зачем нужно: webview может обновить одно сообщение/статус без полной перерисовки state.
 * Какую продуктовую проблему решает: streaming/tool progress выглядит быстрее и не сбрасывает UI-состояние пользователя.
 */
export function postChatPatch({
  state,
  callbacks,
  event
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  event: DaemonEvent;
}): void {
  const patch = mapDaemonEventToChatPatch(event, state.chats);
  if (!patch) return;

  state.suppressedChatStoreStateBroadcasts += 1;
  for (const surface of getSurfaces({ state, callbacks })) {
    void surface.webview.postMessage(patch).then(
      (delivered) =>
        state.logger.info('Chat patch posted to webview', {
          surfaceId: surface.id,
          kind: surface.kind,
          chatId: patch.chatId,
          reason: patch.reason,
          delivered
        }),
      (error) => state.logger.error('Failed to post chat patch to webview', error)
    );
  }
}
