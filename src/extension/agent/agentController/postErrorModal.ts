import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';
import { getSurfaces } from './getSurfaces';

/**
 * Что это: отправляет error modal на все webview surfaces.
 * Зачем нужно: ошибка команды должна быть видна и в sidebar, и в editor chat.
 * Какую продуктовую проблему решает: пользователь не пропускает ошибку, даже если работает не в основной панели.
 */
export function postErrorModal({
  state,
  callbacks,
  message
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  message: string;
}): void {
  for (const surface of getSurfaces({ state, callbacks })) {
    void surface.webview.postMessage({ type: 'errorModal', message }).then(
      (delivered) =>
        state.logger.info('Error modal posted to webview', { surfaceId: surface.id, kind: surface.kind, delivered }),
      (error) => state.logger.error('Failed to post error modal to webview', error)
    );
  }
}
