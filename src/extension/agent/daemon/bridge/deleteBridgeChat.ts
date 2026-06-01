import type { DaemonChatDeleteResult } from '../../../../cli/daemonProtocol';
import type { Chat } from '../../../chats/types';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { createBridgeChat } from './createBridgeChat';
import { getBridgeClient } from './getBridgeClient';
import { getBridgeDefaultModelSettings } from './getBridgeDefaultModelSettings';
import { refreshBridgeState } from './refreshBridgeState';
import { saveActiveChatId } from './saveActiveChatId';

/**
 * Что это: удаляет чат через daemon и выбирает следующий active chat.
 * Зачем нужно: storage-delete и UI active state должны оставаться согласованными.
 * Какую продуктовую проблему решает: после удаления пользователь не остаётся на несуществующем диалоге.
 */
export async function deleteBridgeChat({
  context,
  chatId,
  fallbackModel = context.defaultModel
}: {
  context: BridgeRuntimeContext;
  chatId: string;
  fallbackModel?: string;
}): Promise<Chat> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonChatDeleteResult>('chat.delete', { chatId });
  await refreshBridgeState({ context, activeChatId: result.nextChatId });
  if (!context.chats.getSummaries().length) {
    return createBridgeChat({
      context,
      settings: { ...getBridgeDefaultModelSettings({ context }), model: fallbackModel }
    });
  }

  const active = result.nextChatId ? context.chats.setActiveChat(result.nextChatId) : context.chats.getActiveChat();
  await saveActiveChatId({ context, chatId: active.id });
  return active;
}
