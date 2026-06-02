import type { DaemonChatCreateResult } from '../../../../cli/daemonProtocol';
import type { ChatModelSettings } from '../../../../core/shared/types/types';
import type { Chat } from '../../../chats/types';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { getBridgeClient } from './getBridgeClient';
import { getBridgeDefaultModelSettings } from './getBridgeDefaultModelSettings';
import { saveActiveChatId } from './saveActiveChatId';

/**
 * Что это: создаёт persisted-chat через daemon и активирует его в extension store.
 * Зачем нужно: daemon остаётся source of truth для chat storage.
 * Какую продуктовую проблему решает: новый чат появляется в UI и сохраняется в workspace history.
 */
export async function createBridgeChat({
  context,
  settings = getBridgeDefaultModelSettings({ context })
}: {
  context: BridgeRuntimeContext;
  settings?: ChatModelSettings;
}): Promise<Chat> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonChatCreateResult>('chat.create', {
    model: settings.model,
    modelSettings: settings
  });
  const chat = context.chats.upsert(result.chat);
  context.chats.setActiveChat(chat.id);
  await saveActiveChatId({ context, chatId: chat.id });
  return chat;
}
