import type { DaemonChatGetResult } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { getBridgeClient } from './getBridgeClient';
import { refreshBridgeSubagentRuns } from './refreshBridgeSubagentRuns';

/**
 * Что это: обновляет один чат из daemon и связанные subagent runs.
 * Зачем нужно: daemon events часто относятся к конкретному chatId, поэтому полный refresh не нужен.
 * Какую продуктовую проблему решает: webview быстро получает новое состояние активного диалога без лишних запросов.
 */
export async function refreshBridgeChat({
  context,
  chatId
}: {
  context: BridgeRuntimeContext;
  chatId: string;
}): Promise<void> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonChatGetResult>('chat.get', { chatId });
  context.chats.upsert(result.chat);
  await refreshBridgeSubagentRuns({ context, parentChatId: chatId });
}
