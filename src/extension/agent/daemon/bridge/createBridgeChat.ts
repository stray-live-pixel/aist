import type { DaemonChatCreateResult } from '../../../../cli/daemonProtocol';
import { recordPerformanceTelemetry } from '../../../../core/features/performanceTelemetry';
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
  const startedAt = Date.now();
  try {
    const client = await getBridgeClient({ context });
    const result = await client.request<DaemonChatCreateResult>('chat.create', {
      model: settings.model,
      modelSettings: settings
    });
    const chat = context.chats.upsert(result.chat);
    context.chats.setActiveChat(chat.id);
    await saveActiveChatId({ context, chatId: chat.id });
    recordCreateChatPerformance({ context, startedAt, chatId: chat.id, status: 'success' });
    return chat;
  } catch (error) {
    recordCreateChatPerformance({ context, startedAt, status: 'error' });
    throw error;
  }
}

/**
 * Что это: фиксирует скорость создания persisted-чата.
 * Зачем нужно: создание чата включает daemon RPC и запись activeChatId, поэтому это отдельный пользовательский latency.
 * Какую продуктовую проблему решает: можно увидеть, что тормозит именно создание вкладки/чата, а не запрос модели.
 */
function recordCreateChatPerformance({
  context,
  startedAt,
  chatId,
  status
}: {
  context: BridgeRuntimeContext;
  startedAt: number;
  chatId?: string;
  status: 'success' | 'error';
}): void {
  recordPerformanceTelemetry({
    operation: 'chat.create',
    extensionVersion: String(context.extensionContext.extension.packageJSON?.version || '0.0.0'),
    workspaceRoot: context.workspaceRoot,
    chatId,
    startedAt,
    finishedAt: Date.now(),
    status
  });
}
