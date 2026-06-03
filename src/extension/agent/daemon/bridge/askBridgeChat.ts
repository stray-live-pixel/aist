import type { DaemonChatAskResult } from '../../../../cli/daemonProtocol';
import { recordPerformanceTelemetry } from '../../../../core/features/performanceTelemetry';
import type { AgentAttachment } from '../../../../core/shared/types/types';
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
  options?: { skipUserMessage?: boolean; attachments?: AgentAttachment[] };
}): Promise<void> {
  const startedAt = Date.now();
  try {
    const client = await getBridgeClient({ context });
    await syncBridgeSettings({ context });
    const result = await client.request<DaemonChatAskResult>('chat.ask', {
      chatId,
      prompt,
      skipUserMessage: options.skipUserMessage,
      attachments: options.attachments
    });
    context.state.agentRequestStartedAtByRunId.set(result.runId, {
      startedAt,
      chatId,
      extensionVersion: String(context.extensionContext.extension.packageJSON?.version || '0.0.0'),
      workspaceRoot: context.workspaceRoot
    });
    await refreshBridgeChat({ context, chatId });
  } catch (error) {
    recordFailedAskPerformance({ context, chatId, startedAt });
    throw error;
  }
}

/**
 * Что это: фиксирует отказ/ошибку до принятия agent request daemon-ом.
 * Зачем нужно: если runId не появился, обычный run.finished не придёт и latency иначе потеряется.
 * Какую продуктовую проблему решает: ошибки запуска запроса тоже видны как performance-блокеры.
 */
function recordFailedAskPerformance({
  context,
  chatId,
  startedAt
}: {
  context: BridgeRuntimeContext;
  chatId: string;
  startedAt: number;
}): void {
  recordPerformanceTelemetry({
    operation: 'agent.request',
    extensionVersion: String(context.extensionContext.extension.packageJSON?.version || '0.0.0'),
    workspaceRoot: context.workspaceRoot,
    chatId,
    startedAt,
    finishedAt: Date.now(),
    status: 'error',
    reason: 'chat.ask.failed'
  });
}
