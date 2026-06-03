import type { DaemonEvent } from '../../../cli/daemonProtocol';
import { mapDaemonEventToChatPatch } from '../webview/mapDaemonEventToChatPatch';
import type { AgentControllerState } from './AgentControllerState';

/**
 * Что это: заранее резервирует suppression полного state broadcast для patchable daemon-события.
 * Зачем нужно: bridge делает refresh store позже, а changedEmitter.fire() может сработать до отправки chat.patch.
 * Какую продуктовую проблему решает: webview не получает лишний полный state перед incremental patch на горячем пути агента.
 */
export function reserveChatPatchStateBroadcast({
  state,
  event
}: {
  state: AgentControllerState;
  event: DaemonEvent;
}): void {
  const patch = mapDaemonEventToChatPatch(event, state.chats);
  if (!patch) return;

  state.suppressedChatStoreStateBroadcasts += 1;
}
