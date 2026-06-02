import type { DaemonChatAskResult } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { getBridgeClient } from './getBridgeClient';
import { refreshBridgeChat } from './refreshBridgeChat';
import { syncBridgeSettings } from './syncBridgeSettings';

/**
 * Что это: отправляет prompt в daemon chat.ask и обновляет чат после принятия запроса.
 * Зачем нужно: daemon запускает agent runtime, а extension должна показать актуальные сообщения/status.
 * Какую продуктовую проблему решает: пользователь видит ответ и tool-progress в текущем диалоге.
 */
export async function askBridgeChat({
  context,
  chatId,
  prompt,
  options = {}
}: {
  context: BridgeRuntimeContext;
  chatId: string;
  prompt: string;
  options?: { skipUserMessage?: boolean };
}): Promise<void> {
  const client = await getBridgeClient({ context });
  await syncBridgeSettings({ context });
  await client.request<DaemonChatAskResult>('chat.ask', { chatId, prompt, skipUserMessage: options.skipUserMessage });
  await refreshBridgeChat({ context, chatId });
}
