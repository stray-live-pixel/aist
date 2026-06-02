import type {
  DaemonChatClearResult,
  DaemonChatSetModelResult,
  DaemonChatSetModelSettingsResult,
  DaemonChatStopResult
} from '../../../../cli/daemonProtocol';
import type { ChatModelSettings } from '../../../../core/shared/types/types';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { getBridgeClient } from './getBridgeClient';
import { refreshBridgeState } from './refreshBridgeState';

/**
 * Что это: очищает чат через daemon и обновляет local store.
 * Зачем нужно: clear должен сбросить persisted messages/history/state.
 * Какую продуктовую проблему решает: пользователь начинает диалог заново без старого контекста.
 */
export async function clearBridgeChat({
  context,
  chatId
}: {
  context: BridgeRuntimeContext;
  chatId: string;
}): Promise<void> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonChatClearResult>('chat.clear', { chatId });
  context.chats.upsert(result.chat);
}

/** Меняет модель чата через daemon и обновляет local store. */
export async function setBridgeModel({
  context,
  chatId,
  model
}: {
  context: BridgeRuntimeContext;
  chatId: string;
  model: string;
}): Promise<void> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonChatSetModelResult>('chat.setModel', { chatId, model });
  context.chats.upsert(result.chat);
}

/** Меняет model settings чата через daemon и обновляет local store. */
export async function setBridgeModelSettings({
  context,
  chatId,
  settings
}: {
  context: BridgeRuntimeContext;
  chatId: string;
  settings: Partial<ChatModelSettings>;
}): Promise<void> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonChatSetModelSettingsResult>('chat.setModelSettings', { chatId, settings });
  context.chats.upsert(result.chat);
}

/** Останавливает активный daemon run/chat и обновляет state. */
export async function stopBridgeChat({
  context,
  chatId
}: {
  context: BridgeRuntimeContext;
  chatId?: string;
}): Promise<void> {
  const client = await getBridgeClient({ context });
  await client.request<DaemonChatStopResult>('chat.stop', chatId ? { chatId } : undefined);
  await refreshBridgeState({ context });
}
