import type { DaemonChatGetResult, DaemonState } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { DAEMON_RUNTIME_ACTIVE_CHAT_ID_KEY } from './DAEMON_RUNTIME_ACTIVE_CHAT_ID_KEY';
import { getBridgeClient } from './getBridgeClient';

/**
 * Что это: обновляет полный state чатов из daemon.
 * Зачем нужно: reconnect/start/stop/delete могут менять весь список и activeRun.
 * Какую продуктовую проблему решает: webview sidebar остаётся синхронизированным с daemon source of truth.
 */
export async function refreshBridgeState({
  context,
  activeChatId
}: {
  context: BridgeRuntimeContext;
  activeChatId?: string;
}): Promise<void> {
  const client = await getBridgeClient({ context });
  const state = await client.request<DaemonState>('state.get');
  const chats = await Promise.all(
    state.chats.map(async (summary) => {
      const result = await client.request<DaemonChatGetResult>('chat.get', { chatId: summary.id });
      return result.chat;
    })
  );
  const savedActiveChatId = context.extensionContext.workspaceState.get<string>(DAEMON_RUNTIME_ACTIVE_CHAT_ID_KEY);
  context.chats.replaceAll(chats, activeChatId || savedActiveChatId || state.activeRun?.chatId);
}
