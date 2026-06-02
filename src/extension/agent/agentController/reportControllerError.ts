import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';
import { formatChatErrorMessage } from './formatChatErrorMessage';
import { postErrorModal } from './postErrorModal';

/**
 * Что это: единая обработка ошибок контроллера для webview.
 * Зачем нужно: все команды показывают одинаковый modal и обновляют state после ошибки.
 * Какую продуктовую проблему решает: пользователь получает понятную обратную связь вместо silent failure.
 */
export function reportControllerError({
  state,
  callbacks,
  error,
  context
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  error: unknown;
  context?: string;
}): void {
  postErrorModal({ state, callbacks, message: formatChatErrorMessage({ error, context }) });
  callbacks.sendState();
}
