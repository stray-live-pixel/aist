import type { DaemonChatCompactResult } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { getBridgeClient } from './getBridgeClient';
import { saveActiveChatId } from './saveActiveChatId';

/**
 * Что это: запускает compaction чата через daemon и активирует compacted-чат.
 * Зачем нужно: daemon создаёт новый persisted-chat с предыдущим chat id и compacted history.
 * Какую продуктовую проблему решает: пользователь продолжает длинный диалог в пределах контекста модели.
 */
export async function compactBridgeChat({
  context,
  chatId
}: {
  context: BridgeRuntimeContext;
  chatId: string;
}): Promise<{ id: string }> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonChatCompactResult>('chat.compact', { chatId });
  const chat = context.chats.upsert(result.chat);
  context.chats.setActiveChat(chat.id);
  await saveActiveChatId({ context, chatId: chat.id });
  return { id: chat.id };
}
