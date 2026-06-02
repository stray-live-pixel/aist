import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { DAEMON_RUNTIME_ACTIVE_CHAT_ID_KEY } from './DAEMON_RUNTIME_ACTIVE_CHAT_ID_KEY';

/**
 * Что это: сохраняет id активного daemon-чата в workspaceState.
 * Зачем нужно: выбор пользователя переживает reload extension/window.
 * Какую продуктовую проблему решает: AIST открывается на последнем рабочем диалоге.
 */
export function saveActiveChatId({
  context,
  chatId
}: {
  context: BridgeRuntimeContext;
  chatId: string;
}): Thenable<void> {
  return context.extensionContext.workspaceState.update(DAEMON_RUNTIME_ACTIVE_CHAT_ID_KEY, chatId);
}
